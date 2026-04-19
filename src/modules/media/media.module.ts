import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GalleryResolver } from './gallery.resolver';
import { MediaService } from './media.service';
import { unlink, promises as fs } from 'fs';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    MediaService,
    GalleryResolver,
    {
      provide: 'FS',
      useValue: { unlink: (path: string) => fs.unlink(path) },
    },
  ],
  exports: [MediaService, 'FS'],
})
export class MediaModule {}
