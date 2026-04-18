import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: any;
  let media: any;

  beforeEach(() => {
    prisma = {
      comment: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    media = {
      assertOwnership: jest.fn().mockResolvedValue(undefined),
      resolveUrls: jest.fn().mockResolvedValue({ imageUrls: [], videoUrl: undefined }),
      attachToComment: jest.fn().mockResolvedValue(undefined),
    };
    service = new CommentsService(prisma, media);
  });

  it('create sem media: salva comment', async () => {
    const out = await service.create('u1', {
      postId: 'p1',
      content: 'hi',
      mediaIds: [],
    });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        postId: 'p1',
        content: 'hi',
        authorId: 'u1',
        parentId: undefined,
        imageUrl: [],
        videoUrl: undefined,
      },
    });
    expect(out.id).toBe('c1');
  });

  it('create com media: valida ownership, resolve URLs, attach', async () => {
    media.resolveUrls.mockResolvedValue({ imageUrls: ['/uploads/a.png'], videoUrl: undefined });
    await service.create('u1', { postId: 'p1', content: 'hi', mediaIds: ['m1'] });
    expect(media.assertOwnership).toHaveBeenCalledWith(['m1'], 'u1');
    expect(media.attachToComment).toHaveBeenCalledWith(['m1'], 'c1');
  });

  it('findByPost retorna comments do post', async () => {
    prisma.comment.findMany.mockResolvedValue([{ id: 'c1' }]);
    const out = await service.findByPost('p1');
    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { postId: 'p1' },
      include: { author: true, replies: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(out).toHaveLength(1);
  });

  it('remove: só autor pode apagar', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1' });
    await service.remove('c1', 'u1');
    expect(prisma.comment.delete).toHaveBeenCalled();
  });

  it('remove: lança se não for autor', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u2' });
    await expect(service.remove('c1', 'u1')).rejects.toThrow();
  });
});
