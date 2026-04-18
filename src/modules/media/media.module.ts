import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GalleryResolver } from './gallery.resolver';
import { MediaService } from './media.service';

@Module({
  imports: [PrismaModule],
  providers: [MediaService, GalleryResolver],
  exports: [MediaService],
})
export class MediaModule {}
