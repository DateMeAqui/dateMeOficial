import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadMediasService } from './upload-medias.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { memoryStorage } from 'multer';

interface UploadFileDto {
  isVideo: string;
}

@Controller('upload-medias')
export class UploadMediasController {
  constructor(private readonly uploadMediasService: UploadMediasService) {}

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {storage: memoryStorage()}))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<UploadResponseDto> {

    console.log(typeof uploadFileDto.isVideo)

    if (!file) {
      throw new BadRequestException('No file provided');
    }
    

    try {
      const fileUrl = await this.uploadMediasService.uploadFile(
        file,
        uploadFileDto.isVideo,
      );

      return {
        success: true,
        message: 'File uploaded successfully',
        fileUrl,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFile() files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    try {
      const fileUrls = await Promise.all(
        files.map((file) =>
          this.uploadMediasService.uploadFile(file, uploadFileDto.isVideo),
        ),
      );

      return {
        success: true,
        message: 'Files uploaded successfully',
        fileUrls,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
