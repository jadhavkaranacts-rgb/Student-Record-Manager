import { useState } from 'react';
import { useUpload } from '@workspace/object-storage-web';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function usePhotoUpload() {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadFile, isUploading } = useUpload({
    onError: (err: Error) => setUploadError(err.message || 'Upload failed'),
  });

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds 5MB limit');
      return null;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError('File must be a JPEG, PNG, WEBP, or GIF image');
      return null;
    }

    setUploadError(null);
    const response = await uploadFile(file);
    // objectPath (e.g. "/objects/uploads/<uuid>") is what we persist on the
    // student record; it is resolved to a servable URL via `/api/storage${objectPath}`.
    return response?.objectPath ?? null;
  };

  return { uploadPhoto, isUploading, uploadError, setUploadError };
}
