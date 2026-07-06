/**
 * Generate a consistent default avatar URL for users
 */
export function getDefaultAvatarUrl(name: string | null | undefined, email?: string | null): string {
  // Use email or name for consistent avatar generation
  const seed = email || name || 'user';

  // DiceBear Avatars - initials style with custom colors
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6366f1,8b5cf6,ec4899,f59e0b,10b981`;
}

/**
 * Get avatar URL with fallback to default
 */
export function getAvatarUrl(
  photoURL: string | null | undefined,
  name: string | null | undefined,
  email?: string | null
): string {
  if (photoURL) {
    return photoURL;
  }
  return getDefaultAvatarUrl(name, email);
}
