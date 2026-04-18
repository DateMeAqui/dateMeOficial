export const IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const VIDEO_MIMETYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/mkv',
] as const;

export const ALL_MEDIA_MIMETYPES = [
  ...IMAGE_MIMETYPES,
  ...VIDEO_MIMETYPES,
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
