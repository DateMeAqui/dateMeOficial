import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
import { MediaService } from '../media/media.service';
import { CurrentUserRest } from '../auth/decorators/current-user-rest.decorator';

@Controller('media')
@UseGuards(JwtRestAuthGuard)
export class MediaServeController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':mediaId')
  async serveMedia(
    @Param('mediaId') mediaId: string,
    @CurrentUserRest() user: { id: string },
    @Res() res: any,
  ) {
    const media = await this.mediaService.findById(mediaId);
    if (!media) throw new NotFoundException('Media not found');

    // Verificar se o arquivo pertence ao usuário autenticado
    if (media.ownerId !== user.id) throw new NotFoundException('Media not found');

    const filePath = join(process.cwd(), 'uploads', media.filename);
    if (!existsSync(filePath)) throw new NotFoundException('File not found');

    res.sendFile(filePath);
  }
}
