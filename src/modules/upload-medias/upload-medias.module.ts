import { Module } from '@nestjs/common';
import { UploadMediasService } from './upload-medias.service';
import { UploadMediasResolver } from './upload-medias.resolver';
import { UploadMediasController } from './upload-medias.controller';
import { multerConfig } from './config/multer.config';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register(multerConfig()),
  ],
  controllers: [UploadMediasController],
  providers: [UploadMediasResolver, UploadMediasService],
  exports: [UploadMediasService],
})
export class UploadMediasModule {}
