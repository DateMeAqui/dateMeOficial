import { BadRequestException } from '@nestjs/common';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasService } from './upload-medias.service';
import { MediaService } from '../media/media.service';

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
  let uploadSvc: UploadMediasService;
  let mediaSvc: jest.Mocked<Pick<MediaService, 'recordUpload'>>;

  beforeEach(() => {
    uploadSvc = new UploadMediasService();
    mediaSvc = { recordUpload: jest.fn() } as any;
    controller = new UploadMediasController(uploadSvc, mediaSvc as any);
  });

  const currentUser = { id: 'u1' };

  describe('uploadSingleFile', () => {
    it('lança BadRequest se nenhum arquivo vier', async () => {
      await expect(
        controller.uploadSingleFile(undefined as any, { kind: 'image' }, currentUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna URL + mediaId após registrar upload', async () => {
      const file = makeFile({ mimetype: 'image/png', filename: 'f.png' });
      mediaSvc.recordUpload.mockResolvedValue({ id: 'm1' } as any);
      const out = await controller.uploadSingleFile(file, { kind: 'image' }, currentUser as any);
      expect(out).toEqual({
        success: true,
        message: 'File uploaded successfully',
        fileUrl: '/uploads/f.png',
        mediaId: 'm1',
      });
      expect(mediaSvc.recordUpload).toHaveBeenCalledWith({
        ownerId: 'u1',
        kind: 'image',
        url: '/uploads/f.png',
        filename: 'f.png',
      });
    });
  });

  describe('uploadMultipleFiles', () => {
    it('retorna N URLs + N mediaIds', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'image/jpeg', filename: 'b.jpg' }),
      ];
      mediaSvc.recordUpload.mockResolvedValueOnce({ id: 'm1' } as any);
      mediaSvc.recordUpload.mockResolvedValueOnce({ id: 'm2' } as any);
      const out = await controller.uploadMultipleFiles(files, { kind: 'image' }, currentUser as any);
      expect(out).toEqual({
        success: true,
        message: 'Files uploaded successfully',
        fileUrls: ['/uploads/a.png', '/uploads/b.jpg'],
        mediaIds: ['m1', 'm2'],
      });
      expect(mediaSvc.recordUpload).toHaveBeenCalledTimes(2);
    });
  });
});
