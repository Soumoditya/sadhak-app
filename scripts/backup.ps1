# Sadhak — one-command backup.
# Commits everything, pushes to GitHub (your private cloud backup), and writes a
# timestamped local zip snapshot to Documents\Sadhak-Backups.
#
# HOW TO RUN (from the project folder, in PowerShell):
#     .\scripts\backup.ps1 "what you changed"
# or just:
#     .\scripts\backup.ps1
#
# You can also right-click this file > "Run with PowerShell".

param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

# Move to the project root (the folder above this /scripts folder), so it works
# no matter where you run it from.
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "backup: $stamp"
}

Write-Host "1/3  Saving your changes (commit)..." -ForegroundColor Cyan
git add -A
# Only commit if there is something to commit (avoids an error on a clean repo).
$pending = git status --porcelain
if ($pending) {
  git commit -m $Message | Out-Null
  Write-Host "     committed: $Message" -ForegroundColor Green
} else {
  Write-Host "     nothing new to commit." -ForegroundColor DarkGray
}

Write-Host "2/3  Uploading to GitHub (cloud backup)..." -ForegroundColor Cyan
git push origin master
Write-Host "     pushed to GitHub." -ForegroundColor Green

Write-Host "3/3  Writing a local zip snapshot..." -ForegroundColor Cyan
$backupDir = Join-Path $env:USERPROFILE "Documents\Sadhak-Backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$version = (Get-Content package.json | ConvertFrom-Json).version
$zipName = "sadhak-app-v$version-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".zip"
$zipPath = Join-Path $backupDir $zipName
# git archive = a clean snapshot of your source (no node_modules/android bloat).
git archive --format=zip -o $zipPath HEAD
Write-Host "     saved: $zipPath" -ForegroundColor Green

Write-Host ""
Write-Host "Done. Your work is backed up in TWO places:" -ForegroundColor Green
Write-Host "  - GitHub (private): github.com/Soumoditya/sadhak-app"
Write-Host "  - Local zip: $backupDir"
