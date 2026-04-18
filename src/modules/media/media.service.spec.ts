import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      media: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new MediaService(prisma as PrismaService);
  });

  describe('recordUpload', () => {
    it('cria Media row com owner + kind + url', async () => {
      prisma.media.create.mockResolvedValue({ id: 'm1', ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' });
      const out = await service.recordUpload({ ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' });
      expect(out.id).toBe('m1');
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: { ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' },
      });
    });
  });

  describe('assertOwnership', () => {
    it('não lança quando todas as mídias pertencem ao user', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null },
        { id: 'm2', ownerId: 'u1', attachedAt: null },
      ]);
      await expect(service.assertOwnership(['m1', 'm2'], 'u1')).resolves.toBeUndefined();
    });

    it('lança ForbiddenException quando alguma mídia não pertence ao user', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', ownerId: 'u1', attachedAt: null }]);
      await expect(service.assertOwnership(['m1', 'm2'], 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando mídia já foi attached', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', ownerId: 'u1', attachedAt: new Date() }]);
      await expect(service.assertOwnership(['m1'], 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('aceita array vazio sem consultar banco', async () => {
      await expect(service.assertOwnership([], 'u1')).resolves.toBeUndefined();
      expect(prisma.media.findMany).not.toHaveBeenCalled();
    });
  });

  describe('attachToPost', () => {
    it('atualiza postId e attachedAt das mídias', async () => {
      prisma.media.updateMany.mockResolvedValue({ count: 2 });
      await service.attachToPost(['m1', 'm2'], 'p1');
      expect(prisma.media.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['m1', 'm2'] } },
        data: { postId: 'p1', attachedAt: expect.any(Date) },
      });
    });

    it('no-op em array vazio', async () => {
      await service.attachToPost([], 'p1');
      expect(prisma.media.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('resolveUrls', () => {
    it('retorna URLs filtrando por kind solicitado', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', url: '/uploads/a.png', kind: 'image' },
        { id: 'm2', url: '/uploads/b.mp4', kind: 'video' },
      ]);
      const out = await service.resolveUrls(['m1', 'm2']);
      expect(out).toEqual({
        imageUrls: ['/uploads/a.png'],
        videoUrl: '/uploads/b.mp4',
      });
    });

    it('lança BadRequest se houver mais de um vídeo', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', url: '/uploads/a.mp4', kind: 'video' },
        { id: 'm2', url: '/uploads/b.mp4', kind: 'video' },
      ]);
      await expect(service.resolveUrls(['m1', 'm2'])).rejects.toThrow(BadRequestException);
    });
  });
});
