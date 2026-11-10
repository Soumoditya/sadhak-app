import { makeImageFromView, ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Turn a view into a PNG file (the chart card, with its watermark), using
// Skia's view snapshot so no extra native module is needed.
export async function captureView(ref: React.RefObject<any>, fileName: string): Promise<string> {
  const img = await makeImageFromView(ref);
  if (!img) throw new Error('Could not capture the image.');
  const b64 = img.encodeToBase64(ImageFormat.PNG, 100);
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

/** Save an image into the phone's gallery (asks for photo permission once). */
export async function saveImageToGallery(uri: string): Promise<boolean> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
