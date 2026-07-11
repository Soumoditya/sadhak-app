package expo.modules.sadhakwallpaper

import android.app.WallpaperManager
import android.graphics.BitmapFactory
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class SadhakWallpaperModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SadhakWallpaper")

    // Set a local image file as the wallpaper. target: "home" | "lock" | "both".
    AsyncFunction("setWallpaper") { fileUri: String, target: String ->
      val context = appContext.reactContext
        ?: throw Exception("No Android context available")

      val path = fileUri.removePrefix("file://")
      val file = File(path)
      if (!file.exists()) throw Exception("Wallpaper file not found: $path")

      val bitmap = BitmapFactory.decodeFile(file.absolutePath)
        ?: throw Exception("Could not decode image")

      val wm = WallpaperManager.getInstance(context)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        val which = when (target) {
          "home" -> WallpaperManager.FLAG_SYSTEM
          "lock" -> WallpaperManager.FLAG_LOCK
          else -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        }
        wm.setBitmap(bitmap, null, true, which)
      } else {
        // Pre-N: only the home screen wallpaper is settable programmatically.
        wm.setBitmap(bitmap)
      }
      true
    }
  }
}
