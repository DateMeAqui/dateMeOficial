import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

export const ALL_MEDIA_MIMETYPES = [...IMAGE_MIMETYPES, ...VIDEO_MIMETYPES];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const multerConfig = () => ({
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req, file, callback) => {
    if ((ALL_MEDIA_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Invalid file type.'), false);
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});