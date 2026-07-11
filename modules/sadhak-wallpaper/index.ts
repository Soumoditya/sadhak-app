import { requireNativeModule } from 'expo-modules-core';

// Native module backed by Android's WallpaperManager. Reliable across OEM skins
// (ColorOS/MIUI/OneUI) where the ACTION_ATTACH_DATA intent silently no-ops.
export type WallpaperTarget = 'home' | 'lock' | 'both';

// Lazily resolve so a missing native module (e.g. before a fresh prebuild) never
// throws at import time and crashes the screen. Returns null if unavailable.
function getNative(): any | null {
  try {
    return requireNativeModule('SadhakWallpaper');
  } catch {
    return null;
  }
}

export function isWallpaperModuleAvailable(): boolean {
  return getNative() != null;
}

/**
 * Set a local image file as the device wallpaper.
 * @param fileUri local file path (file://…), already downloaded.
 * @param target which screen(s) to apply to.
 * @returns true on success. Throws if the native module is unavailable or fails.
 */
export function setWallpaper(fileUri: string, target: WallpaperTarget): Promise<boolean> {
  const native = getNative();
  if (!native) return Promise.reject(new Error('Wallpaper module unavailable'));
  return native.setWallpaper(fileUri, target);
}
