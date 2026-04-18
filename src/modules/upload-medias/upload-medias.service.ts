import { BadRequestException, Injectable } from '@nestjs/common';
import { IMAGE_MIMETYPES, VIDEO_MIMETYPES } from './config/media-mimetypes';

export type MediaKind = 'image' | 'video';

@Injectable()
export class UploadMediasService {
  buildUrl(file: Express.Multer.File): string {
    return `/uploads/${file.filename}`;
  }

  assertMimetypeMatchesKind(file: Express.Multer.File, kind: MediaKind): void {
    if (kind === 'image' && !(IMAGE_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type.');
    }
    if (kind === 'video' && !(VIDEO_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Unsupported video type.');
    }
  }
}
