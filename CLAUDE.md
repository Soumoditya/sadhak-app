# Sadhak: notes for Claude sessions

## Building the APK
- Default: the **Build APK (GitHub)** workflow (`.github/workflows/apk-github.yml`).
  It runs `eas build --local` on a GitHub runner (no Expo queue, same release key)
  and attaches `sadhak.apk` to a GitHub pre-release. Trigger it by editing that
  file (push) or with workflow_dispatch; the run log prints the direct link.
- Touching `apk-github.yml` also starts **Build APK (EAS)** (`eas-build.yml`)
  in Expo's cloud. Deliver whichever APK finishes first; don't wait on a queued
  Expo build.
- The repo is public (faster 4-core GitHub runners). Never commit secrets: keys
  live in GitHub secrets or Vercel env vars.
- JS-only changes ship over the air: pushing to the branch runs
  **Publish OTA update**. A new APK is needed only for native changes
  (new native module, permissions, icon/splash, version bump).

## User preferences
- Never use em dashes.
- Work quietly; final answer short: only what's important or urgent.
- Never ask for tokens in chat; the Expo token is the GitHub secret `EXPO_TOKEN`.
