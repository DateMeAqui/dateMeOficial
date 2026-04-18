import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: any;
  let media: any;

  beforeEach(() => {
    prisma = {
      post: {
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    media = {
      assertOwnership: jest.fn().mockResolvedValue(undefined),
      resolveUrls: jest.fn().mockResolvedValue({ imageUrls: [], videoUrl: undefined }),
      attachToPost: jest.fn().mockResolvedValue(undefined),
    };
    service = new PostsService(prisma, media);
  });

  describe('create', () => {
    it('sem mediaIds: cria post só com content', async () => {
      const out = await service.create({ content: 'hello', authorId: 'u1', mediaIds: [] });
      expect(media.assertOwnership).toHaveBeenCalledWith([], 'u1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: { content: 'hello', authorId: 'u1', imageUrl: [], videoUrl: undefined },
      });
      expect(out.id).toBe('p1');
    });

    it('com mediaIds: valida, resolve URLs, cria post, attach media', async () => {
      media.resolveUrls.mockResolvedValue({ imageUrls: ['/uploads/a.png'], videoUrl: '/uploads/b.mp4' });
      await service.create({ content: 'hi', authorId: 'u1', mediaIds: ['m1', 'm2'] });
      expect(media.assertOwnership).toHaveBeenCalledWith(['m1', 'm2'], 'u1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: { content: 'hi', authorId: 'u1', imageUrl: ['/uploads/a.png'], videoUrl: '/uploads/b.mp4' },
      });
      expect(media.attachToPost).toHaveBeenCalledWith(['m1', 'm2'], 'p1');
    });
  });
});
