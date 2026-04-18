import { BadRequestException } from '@nestjs/common';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasService } from './upload-medias.service';

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: overrides.originalname ?? 'a.jpg',
    encoding: '7bit',
    mimetype: overrides.mimetype ?? 'image/jpeg',
    size: overrides.size ?? 100,
    destination: './uploads',
    filename: overrides.filename ?? 'abc-123.jpg',
    path: `./uploads/${overrides.filename ?? 'abc-123.jpg'}`,
    stream: null as any,
    buffer: null as any,
  }) as Express.Multer.File;

describe('UploadMediasController', () => {
  let controller: UploadMediasController;
  let service: UploadMediasService;

  beforeEach(() => {
    service = new UploadMediasService();
    controller = new UploadMediasController(service);
  });

  describe('uploadSingleFile', () => {
    it('lança BadRequest se nenhum arquivo vier', async () => {
      await expect(
        controller.uploadSingleFile(undefined as any, { kind: 'image' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna URL quando arquivo e kind batem (image)', async () => {
      const file = makeFile({ mimetype: 'image/png', filename: 'f.png' });
      const out = await controller.uploadSingleFile(file, { kind: 'image' });
      expect(out).toEqual({
        success: true,
        message: 'File uploaded successfully',
        fileUrl: '/uploads/f.png',
      });
    });

    it('rejeita imagem quando kind=video', async () => {
      const file = makeFile({ mimetype: 'image/png' });
      await expect(
        controller.uploadSingleFile(file, { kind: 'video' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadMultipleFiles', () => {
    it('lança BadRequest se array vazio', async () => {
      await expect(
        controller.uploadMultipleFiles([], { kind: 'image' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('processa múltiplos arquivos e retorna N URLs', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'image/jpeg', filename: 'b.jpg' }),
      ];
      const out = await controller.uploadMultipleFiles(files, { kind: 'image' });
      expect(out).toEqual({
        success: true,
        message: 'Files uploaded successfully',
        fileUrls: ['/uploads/a.png', '/uploads/b.jpg'],
      });
    });

    it('rejeita se qualquer arquivo do lote bater errado com kind', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'video/mp4', filename: 'b.mp4' }),
      ];
      await expect(
        controller.uploadMultipleFiles(files, { kind: 'image' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
