# Sadhak - backup (manual OR automatic).
# Commits any changes, pushes to GitHub (private cloud backup), and writes a
# timestamped local zip snapshot to Documents\Sadhak-Backups.
#
# MANUAL (from the project folder, in PowerShell):
#     .\scripts\backup.ps1 "what you changed"
# AUTOMATIC: a login launcher runs this for you every time you sign in, so you
# never have to think about it.
#
# Offline-safe: with no internet it still commits + zips locally and skips the
# upload (the next run pushes everything).

param(
  [string]$Message = "",
  [switch]$Quiet
)

function Say($text, $color = "Gray") { if (-not $Quiet) { Write-Host $text -ForegroundColor $color } }

# Work from the project root (folder above /scripts), whatever the caller's dir.
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "auto-backup: $stamp" }

# 1) Commit any changes (skip cleanly if nothing changed).
Say "1/3  Saving changes (commit)..." "Cyan"
git add -A 2>$null
$pending = git status --porcelain
if ($pending) {
  git commit -m $Message | Out-Null
  Say "     committed: $Message" "Green"
} else {
  Say "     nothing new to commit." "DarkGray"
}

# 2) Push to GitHub - never let an offline moment fail the whole backup.
Say "2/3  Uploading to GitHub..." "Cyan"
git push origin master 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
  Say "     pushed to GitHub." "Green"
} else {
  Say "     could not push (offline?) - will push next time." "Yellow"
}

# 3) Local zip snapshot (clean source only, no node_modules/android bloat).
Say "3/3  Writing local zip snapshot..." "Cyan"
$backupDir = Join-Path $env:USERPROFILE "Documents\Sadhak-Backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
$zipName = "sadhak-app-v$version-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".zip"
$zipPath = Join-Path $backupDir $zipName
git archive --format=zip -o $zipPath HEAD
Say "     saved: $zipPath" "Green"

# Keep only the 24 most recent zips so months of auto-runs do not fill the disk.
Get-ChildItem $backupDir -Filter "sadhak-app-v*.zip" |
  Sort-Object LastWriteTime -Descending | Select-Object -Skip 24 |
  Remove-Item -Force -ErrorAction SilentlyContinue

Say ""
Say "Backed up: GitHub (private) + $backupDir" "Green"
