import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FollowService } from './follow.service';

describe('FollowService', () => {
  let service: FollowService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaMock = {
      profile: {
        findUniqueOrThrow: jest.fn(),
      },
      follow: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // follow
  // ──────────────────────────────────────────────
  describe('follow', () => {
    const followerProfile = { id: 'prof-A' };
    const followingProfile = { id: 'prof-B' };
    const fakeFollow = { followerId: 'prof-A', followingId: 'prof-B', createdAt: new Date() };

    it('resolve os dois profiles pelo userId/profileId, cria o registro e retorna o Follow', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(followerProfile)
        .mockResolvedValueOnce(followingProfile);
      (prismaMock.follow.create as jest.Mock).mockResolvedValueOnce(fakeFollow);

      const result = await service.follow('user-A', 'prof-B');

      expect(prismaMock.profile.findUniqueOrThrow).toHaveBeenNthCalledWith(1, { where: { userId: 'user-A' } });
      expect(prismaMock.profile.findUniqueOrThrow).toHaveBeenNthCalledWith(2, { where: { id: 'prof-B' } });
      expect(prismaMock.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'prof-A', followingId: 'prof-B' },
      });
      expect(result).toEqual(fakeFollow);
    });

    it('lança BadRequestException quando o usuário tenta seguir a si mesmo', async () => {
      const sameProfile = { id: 'prof-A' };
      (prismaMock.profile.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(sameProfile)
        .mockResolvedValueOnce(sameProfile);

      await expect(service.follow('user-A', 'prof-A')).rejects.toThrow(BadRequestException);
      expect(prismaMock.follow.create).not.toHaveBeenCalled();
    });

    it('propaga P2002 como ConflictException quando já está seguindo', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(followerProfile)
        .mockResolvedValueOnce(followingProfile);

      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.15.0' },
      );
      (prismaMock.follow.create as jest.Mock).mockRejectedValueOnce(p2002);

      await expect(service.follow('user-A', 'prof-B')).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // unfollow
  // ──────────────────────────────────────────────
  describe('unfollow', () => {
    const followerProfile = { id: 'prof-A' };

    it('deleta a relação e retorna true', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(followerProfile);
      (prismaMock.follow.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

      const result = await service.unfollow('user-A', 'prof-B');

      expect(prismaMock.follow.deleteMany).toHaveBeenCalledWith({
        where: { followerId: 'prof-A', followingId: 'prof-B' },
      });
      expect(result).toBe(true);
    });

    it('retorna true silenciosamente quando a relação não existia (no-op idempotente)', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(followerProfile);
      (prismaMock.follow.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

      const result = await service.unfollow('user-A', 'prof-B');

      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // isFollowing
  // ──────────────────────────────────────────────
  describe('isFollowing', () => {
    const followerProfile = { id: 'prof-A' };

    it('retorna true quando a relação existe', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(followerProfile);
      (prismaMock.follow.findUnique as jest.Mock).mockResolvedValueOnce({
        followerId: 'prof-A', followingId: 'prof-B', createdAt: new Date(),
      });

      const result = await service.isFollowing('user-A', 'prof-B');

      expect(prismaMock.follow.findUnique).toHaveBeenCalledWith({
        where: { followerId_followingId: { followerId: 'prof-A', followingId: 'prof-B' } },
      });
      expect(result).toBe(true);
    });

    it('retorna false quando a relação não existe', async () => {
      (prismaMock.profile.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(followerProfile);
      (prismaMock.follow.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.isFollowing('user-A', 'prof-B');

      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // getFollowers
  // ──────────────────────────────────────────────
  describe('getFollowers', () => {
    const fakeProfiles = [
      { id: 'prof-X', userId: 'u-x' },
      { id: 'prof-Y', userId: 'u-y' },
    ];

    it('retorna lista paginada de profiles que seguem o profile informado', async () => {
      (prismaMock.follow.count as jest.Mock).mockResolvedValueOnce(2);
      (prismaMock.follow.findMany as jest.Mock).mockResolvedValueOnce([
        { follower: fakeProfiles[0] },
        { follower: fakeProfiles[1] },
      ]);

      const result = await service.getFollowers('prof-B', 1, 10);

      expect(prismaMock.follow.count).toHaveBeenCalledWith({ where: { followingId: 'prof-B' } });
      expect(prismaMock.follow.findMany).toHaveBeenCalledWith({
        where: { followingId: 'prof-B' },
        include: { follower: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        profiles: fakeProfiles,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('calcula totalPages corretamente com múltiplas páginas', async () => {
      (prismaMock.follow.count as jest.Mock).mockResolvedValueOnce(25);
      (prismaMock.follow.findMany as jest.Mock).mockResolvedValueOnce(
        Array(10).fill({ follower: { id: 'x' } }),
      );

      const result = await service.getFollowers('prof-B', 2, 10);

      expect(prismaMock.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
    });
  });

  // ──────────────────────────────────────────────
  // getFollowing
  // ──────────────────────────────────────────────
  describe('getFollowing', () => {
    it('retorna lista paginada de profiles que o profile informado segue', async () => {
      const fakeProfiles = [{ id: 'prof-C', userId: 'u-c' }];
      (prismaMock.follow.count as jest.Mock).mockResolvedValueOnce(1);
      (prismaMock.follow.findMany as jest.Mock).mockResolvedValueOnce([
        { following: fakeProfiles[0] },
      ]);

      const result = await service.getFollowing('prof-A', 1, 10);

      expect(prismaMock.follow.count).toHaveBeenCalledWith({ where: { followerId: 'prof-A' } });
      expect(prismaMock.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: 'prof-A' },
        include: { following: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        profiles: fakeProfiles,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  // ──────────────────────────────────────────────
  // getFollowersCount / getFollowingCount
  // ──────────────────────────────────────────────
  describe('getFollowersCount', () => {
    it('delega ao prisma.follow.count filtrando followingId', async () => {
      (prismaMock.follow.count as jest.Mock).mockResolvedValueOnce(42);

      const result = await service.getFollowersCount('prof-B');

      expect(prismaMock.follow.count).toHaveBeenCalledWith({ where: { followingId: 'prof-B' } });
      expect(result).toBe(42);
    });
  });

  describe('getFollowingCount', () => {
    it('delega ao prisma.follow.count filtrando followerId', async () => {
      (prismaMock.follow.count as jest.Mock).mockResolvedValueOnce(7);

      const result = await service.getFollowingCount('prof-A');

      expect(prismaMock.follow.count).toHaveBeenCalledWith({ where: { followerId: 'prof-A' } });
      expect(result).toBe(7);
    });
  });
});
