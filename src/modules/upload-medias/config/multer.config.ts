import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ALL_MEDIA_MIMETYPES,
  MAX_FILE_SIZE_BYTES,
} from './media-mimetypes';

export {
  IMAGE_MIMETYPES,
  VIDEO_MIMETYPES,
  ALL_MEDIA_MIMETYPES,
  MAX_FILE_SIZE_BYTES,
} from './media-mimetypes';

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
