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
  const formData = new FormData();

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

  formData.append('file', {
    uri: fileUri,
    type: mimeType,
    name: fileName,
  } as any);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  // This Cloudinary account requires the api_key present even for the unsigned
  // preset — verified by direct API test. Without it: {"error":"Unknown API key"}.
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('folder', folder);

  // Route PDFs/other docs to the raw endpoint, images to auto (Cloudinary picks).
  const uploadUrl =
    resourceType === 'raw' || mimeType === 'application/pdf'
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/raw/upload`
      : CLOUDINARY_CONFIG.uploadUrl;

  try {
    // IMPORTANT: do NOT set Content-Type manually. React Native's fetch must add
    // the multipart boundary itself; hardcoding 'multipart/form-data' omits the
    // boundary and Cloudinary rejects the body (this was why uploads failed).
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
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
