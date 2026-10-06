# Sadhak: notes for Claude sessions

## Building the APK
- Default: the **Build APK (GitHub)** workflow (`.github/workflows/apk-github.yml`).
  It runs `eas build --local` on a GitHub runner (no Expo queue, same release key)
  and attaches `sadhak.apk` to a GitHub pre-release. Trigger it by editing that
  file (push) or with workflow_dispatch; the run log prints the direct link.
- **Build APK (EAS)** (`eas-build.yml`) is a manual fallback only. If an Expo
  cloud build sits queued or runs long, don't wait on it: use the GitHub build
  (or suggest something faster) instead.
- JS-only changes ship over the air: pushing to the branch runs
  **Publish OTA update**. A new APK is needed only for native changes
  (new native module, permissions, icon/splash, version bump).

## User preferences
- Never use em dashes.
- Work quietly; final answer short: only what's important or urgent.
- Never ask for tokens in chat; the Expo token is the GitHub secret `EXPO_TOKEN`.
