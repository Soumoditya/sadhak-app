// Cloudinary Configuration for Sadhak App
// Uses unsigned upload preset for client-side uploads

export const CLOUDINARY_CONFIG = {
  cloudName: 'dq3bkfgid', // We'll derive this from API key
  apiKey: '237799184126571',
  uploadPreset: 'Sadhak',
  uploadUrl: 'https://api.cloudinary.com/v1_1/dq3bkfgid/auto/upload',
};

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  original_filename: string;
  created_at: string;
}

/**
 * Upload a file to Cloudinary using unsigned preset
 * @param fileUri - Local file URI (from document picker, camera, etc.)
 * @param folder - Cloudinary folder to upload to (e.g., 'library', 'profiles')
 * @param resourceType - 'image', 'raw' (for PDFs), 'video', or 'auto'
 */
export async function uploadToCloudinary(
  fileUri: string,
  folder: string = 'sadhak',
  resourceType: string = 'auto'
): Promise<CloudinaryUploadResponse> {
  // Get filename from URI
  const uriParts = fileUri.split('/');
  const fileName = uriParts[uriParts.length - 1];

  // Determine MIME type
  const extension = fileName.split('.').pop()?.toLowerCase();
  let mimeType = 'application/octet-stream';
  if (extension === 'pdf') mimeType = 'application/pdf';
  else if (['jpg', 'jpeg'].includes(extension || '')) mimeType = 'image/jpeg';
  else if (extension === 'png') mimeType = 'image/png';
  else if (extension === 'webp') mimeType = 'image/webp';

  // Route PDFs/other docs to the raw endpoint, images to auto (Cloudinary picks).
  const uploadUrl =
    resourceType === 'raw' || mimeType === 'application/pdf'
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/raw/upload`
      : CLOUDINARY_CONFIG.uploadUrl;

  // IMPORTANT: we use expo-file-system's NATIVE multipart uploader, not fetch()+
  // FormData. React Native's new architecture throws "Unsupported FormDataPart
  // implementation" for {uri,...} file parts before the request even leaves the
  // phone — confirmed on-device. uploadAsync streams the file natively.
  const { uploadAsync, FileSystemUploadType } = require('expo-file-system/legacy');

  const MAX_ATTEMPTS = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        parameters: {
          upload_preset: CLOUDINARY_CONFIG.uploadPreset,
          // This account requires api_key even on the unsigned preset —
          // verified by direct API test ("Unknown API key" without it).
          api_key: CLOUDINARY_CONFIG.apiKey,
          folder,
        },
      });

      if (res.status >= 200 && res.status < 300) {
        return JSON.parse(res.body) as CloudinaryUploadResponse;
      }

      let message = res.body;
      try { message = JSON.parse(res.body)?.error?.message || res.body; } catch {}
      // Server rejected it (preset/key/size) — retrying won't change the answer.
      throw Object.assign(new Error(`Cloudinary: ${message}`), { noRetry: true });
    } catch (error: any) {
      lastError = error;
      if (error?.noRetry) break;
      if (attempt < MAX_ATTEMPTS) {
        // transient network failure — brief backoff, then retry (1s, 2s)
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
    }
  }

  console.error('Cloudinary upload error:', lastError);
  const raw = String(lastError?.message || lastError);
  if (/network request failed|econnreset|socket|abort/i.test(raw)) {
    throw new Error('Network failed mid-upload. Your connection is resetting large uploads — try again on stronger internet.');
  }
  throw new Error(raw);
}

/**
 * Get a Cloudinary URL with transformations
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;
  
  let transformations = `q_${quality},f_${format}`;
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  if (width || height) transformations += `,c_${crop}`;

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${transformations}/${publicId}`;
}
