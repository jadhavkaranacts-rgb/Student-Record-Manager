import { useState } from 'react';

export function usePhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds 5MB limit");
      return null;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError("File must be an image");
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/students/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      return data.photoUrl;
    } catch (err: any) {
      setUploadError(err.message || 'Network error during upload');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadPhoto, isUploading, uploadError, setUploadError };
}
