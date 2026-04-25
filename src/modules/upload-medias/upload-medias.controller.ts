import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { CurrentUserRest } from '../auth/decorators/current-user-rest.decorator';
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
import { MediaService } from '../media/media.service';
import {
  ALL_MEDIA_MIMETYPES,
  MAX_FILE_SIZE_BYTES,
} from './config/media-mimetypes';
import { UploadResponseDto } from './dto/upload-response.dto';
import { UploadMediasService } from './upload-medias.service';
import type { MediaKind } from './upload-medias.service';

class UploadKindDto {
  @IsIn(['image', 'video'])
  kind: MediaKind;
}

const MAX_MULTIPLE_FILES = 10;

const parseSingleFilePipe = () =>
  new ParseFilePipe({
    validators: [
      {
        isValid(file: Express.Multer.File) {
          if (!file) return false;
          if (file.size > MAX_FILE_SIZE_BYTES) return false;
          return (ALL_MEDIA_MIMETYPES as readonly string[]).includes(file.mimetype);
        },
        buildErrorMessage: () => 'Invalid file (size or mimetype).',
      } as any,
    ],
    fileIsRequired: true,
  });

@Controller('upload-medias')
@UseGuards(JwtRestAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 20 } })
export class UploadMediasController {
  constructor(
    private readonly uploadMediasService: UploadMediasService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile(parseSingleFilePipe()) file: Express.Multer.File,
    @Body() body: UploadKindDto,
    @CurrentUserRest() user: { id: string },
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.uploadMediasService.assertMimetypeMatchesKind(file, body.kind);

    const url = this.uploadMediasService.buildUrl(file);
    const media = await this.mediaService.recordUpload({
      ownerId: user.id,
      kind: body.kind,
      url,
      filename: file.filename,
    });

    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: url,
      mediaId: media.id,
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', MAX_MULTIPLE_FILES))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadKindDto,
    @CurrentUserRest() user: { id: string },
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    files.forEach((f) =>
      this.uploadMediasService.assertMimetypeMatchesKind(f, body.kind),
    );

    const urls = files.map((f) => this.uploadMediasService.buildUrl(f));
    const medias = await Promise.all(
      files.map((f, idx) =>
        this.mediaService.recordUpload({
          ownerId: user.id,
          kind: body.kind,
          url: urls[idx],
          filename: f.filename,
        }),
      ),
    );

    return {
      success: true,
      message: 'Files uploaded successfully',
      fileUrls: urls,
      mediaIds: medias.map((m) => m.id),
    };
  }
}
