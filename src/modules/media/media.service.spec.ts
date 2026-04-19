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

  describe('addGalleryPhoto', () => {
    it('valida ownership, cria Photo, attaches media', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null, url: '/uploads/x.png', kind: 'image' },
      ]);
      prisma.photo = { create: jest.fn().mockResolvedValue({ id: 'p1', url: '/uploads/x.png', userId: 'u1' }) };
      prisma.media.update = jest.fn().mockResolvedValue({});
      const out = await service.addGalleryPhoto('m1', 'u1');
      expect(out.id).toBe('p1');
      expect(prisma.photo.create).toHaveBeenCalledWith({
        data: { url: '/uploads/x.png', userId: 'u1' },
      });
      expect(prisma.media.update).toHaveBeenCalled();
    });

    it('rejeita vídeo na galeria', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null, url: '/uploads/x.mp4', kind: 'video' },
      ]);
      await expect(service.addGalleryPhoto('m1', 'u1')).rejects.toThrow();
    });
  });

  describe('removeGalleryPhoto', () => {
    it('apaga photo se pertencer ao user', async () => {
      prisma.photo = {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' }),
        delete: jest.fn().mockResolvedValue({}),
      };
      await service.removeGalleryPhoto('p1', 'u1');
      expect(prisma.photo.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('lança ForbiddenException se photo não for do user', async () => {
      prisma.photo = {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u2' }),
      };
      await expect(service.removeGalleryPhoto('p1', 'u1')).rejects.toThrow();
    });
  });

  describe('listGalleryPhotos', () => {
    it('retorna photos do user ordenadas por createdAt desc', async () => {
      prisma.photo = { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]) };
      const out = await service.listGalleryPhotos('u1');
      expect(prisma.photo.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(out).toHaveLength(2);
    });
  });

  describe('cleanupOrphans', () => {
    let fsMock: { unlink: jest.Mock };
    let svc: MediaService;

    beforeEach(() => {
      fsMock = { unlink: jest.fn().mockResolvedValue(undefined) };
      prisma.media.findMany = jest.fn();
      prisma.media.deleteMany = jest.fn();
      svc = new MediaService(prisma as any, fsMock as any);
    });

    it('remove arquivos e rows órfãos', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', filename: 'a.png' },
        { id: 'm2', filename: 'b.mp4' },
      ]);
      prisma.media.deleteMany.mockResolvedValue({ count: 2 });

      const removed = await svc.cleanupOrphans();

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: {
          attachedAt: null,
          postId: null,
          commentId: null,
          photoId: null,
          profileAvatarId: null,
          createdAt: { lt: expect.any(Date) },
        },
        select: { id: true, filename: true },
      });
      expect(fsMock.unlink).toHaveBeenCalledTimes(2);
      expect(fsMock.unlink).toHaveBeenCalledWith('uploads/a.png');
      expect(fsMock.unlink).toHaveBeenCalledWith('uploads/b.mp4');
      expect(prisma.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['m1', 'm2'] } } });
      expect(removed).toBe(2);
    });

    it('no-op se nada órfão', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      const removed = await svc.cleanupOrphans();
      expect(fsMock.unlink).not.toHaveBeenCalled();
      expect(prisma.media.deleteMany).not.toHaveBeenCalled();
      expect(removed).toBe(0);
    });

    it('ignora erro de unlink e ainda apaga row', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', filename: 'a.png' }]);
      fsMock.unlink.mockRejectedValueOnce(new Error('ENOENT'));
      prisma.media.deleteMany.mockResolvedValue({ count: 1 });

      const removed = await svc.cleanupOrphans();
      expect(prisma.media.deleteMany).toHaveBeenCalled();
      expect(removed).toBe(1);
    });
  });
});
