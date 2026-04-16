import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUploadMediaInput } from './dto/create-upload-media.input';
import { UpdateUploadMediaInput } from './dto/update-upload-media.input';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';

@Injectable()
export class UploadMediasService {
  private readonly uploadDir = './uploads';

  constructor() {
    this.ensureUploadDirectoryExists();
  }

  async uploadFile(file: Express.Multer.File, isVideoParam: string): Promise<string> {

    
    const isVideo = isVideoParam === 'true' ? true : false;
    this.validateFileType(file, isVideo);

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(this.uploadDir, fileName);

    console.log('cheguei aqui', filePath);

    await this.saveFile(file.buffer, filePath);

    return `/uploads/${fileName}`;
  }



  private validateFileType(file: Express.Multer.File, isVideo: boolean): void {
    const imageMines = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const videoMines = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];

    if(isVideo && !videoMines.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported video type.');
    }
    
    if(!isVideo && !imageMines.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image typed.');
    }

  }

  private ensureUploadDirectoryExists(): void {
    if (!existsSync(this.uploadDir)) {
      try {
        mkdirSync(this.uploadDir, { recursive: true });
      } catch (error) {
        throw new InternalServerErrorException('Failed to create upload directory');
      }
    }
  }

  private saveFile(buffer: Buffer, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(path);
      console.log('cheguei aqui', writeStream);
      writeStream.write(buffer);
      writeStream.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(new InternalServerErrorException('Failed to save file')));
    });
  }

}
