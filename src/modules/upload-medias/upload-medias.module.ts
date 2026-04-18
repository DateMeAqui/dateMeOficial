import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { multerConfig } from './config/multer.config';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasResolver } from './upload-medias.resolver';
import { UploadMediasService } from './upload-medias.service';

@Module({
  imports: [
    MulterModule.register(multerConfig()),
    AuthModule,
    MediaModule,
  ],
  controllers: [UploadMediasController],
  providers: [UploadMediasResolver, UploadMediasService],
  exports: [UploadMediasService],
})
export class UploadMediasModule {}
