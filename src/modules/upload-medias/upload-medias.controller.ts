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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
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
export class UploadMediasController {
  constructor(private readonly uploadMediasService: UploadMediasService) {}

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile(parseSingleFilePipe()) file: Express.Multer.File,
    @Body() body: UploadKindDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.uploadMediasService.assertMimetypeMatchesKind(file, body.kind);

    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: this.uploadMediasService.buildUrl(file),
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', MAX_MULTIPLE_FILES))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadKindDto,
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    files.forEach((f) =>
      this.uploadMediasService.assertMimetypeMatchesKind(f, body.kind),
    );

    return {
      success: true,
      message: 'Files uploaded successfully',
      fileUrls: files.map((f) => this.uploadMediasService.buildUrl(f)),
    };
  }
}
