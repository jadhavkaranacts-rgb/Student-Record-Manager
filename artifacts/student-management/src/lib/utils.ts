import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a stored student photoUrl (an object storage path like
 * "/objects/uploads/<uuid>") into a servable URL via the storage route.
 */
export function getPhotoSrc(photoUrl: string | null | undefined): string | undefined {
  if (!photoUrl) return undefined;
  return `/api/storage${photoUrl}`;
}
