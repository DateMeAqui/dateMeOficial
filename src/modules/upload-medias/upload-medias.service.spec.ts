import { BadRequestException } from '@nestjs/common';
import { UploadMediasService } from './upload-medias.service';

const makeFile = (partial: Partial<Express.Multer.File>): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: partial.originalname ?? 'a.jpg',
    encoding: '7bit',
    mimetype: partial.mimetype ?? 'image/jpeg',
    size: partial.size ?? 100,
    destination: './uploads',
    filename: partial.filename ?? 'abc-123.jpg',
    path: `./uploads/${partial.filename ?? 'abc-123.jpg'}`,
    stream: null as any,
    buffer: null as any,
  }) as Express.Multer.File;

describe('UploadMediasService', () => {
  let service: UploadMediasService;

  beforeEach(() => {
    service = new UploadMediasService();
  });

  it('buildUrl retorna /uploads/<filename> para arquivo de imagem válido', () => {
    const file = makeFile({ mimetype: 'image/png', filename: 'xyz.png' });
    expect(service.buildUrl(file)).toBe('/uploads/xyz.png');
  });

  it('buildUrl retorna /uploads/<filename> para vídeo válido', () => {
    const file = makeFile({ mimetype: 'video/mp4', filename: 'clip.mp4' });
    expect(service.buildUrl(file)).toBe('/uploads/clip.mp4');
  });

  it('assertMimetypeMatchesKind rejeita vídeo quando kind=image', () => {
    const file = makeFile({ mimetype: 'video/mp4' });
    expect(() => service.assertMimetypeMatchesKind(file, 'image')).toThrow(BadRequestException);
  });

  it('assertMimetypeMatchesKind rejeita imagem quando kind=video', () => {
    const file = makeFile({ mimetype: 'image/png' });
    expect(() => service.assertMimetypeMatchesKind(file, 'video')).toThrow(BadRequestException);
  });

  it('assertMimetypeMatchesKind aceita quando bate', () => {
    expect(() =>
      service.assertMimetypeMatchesKind(makeFile({ mimetype: 'image/png' }), 'image'),
    ).not.toThrow();
    expect(() =>
      service.assertMimetypeMatchesKind(makeFile({ mimetype: 'video/mp4' }), 'video'),
    ).not.toThrow();
  });
});
