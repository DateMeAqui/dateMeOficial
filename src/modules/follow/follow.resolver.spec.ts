import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../profile/profile.service';
import { FollowResolver } from './follow.resolver';
import { FollowService } from './follow.service';

describe('FollowResolver', () => {
  let resolver: FollowResolver;
  let followService: jest.Mocked<FollowService>;
  let profileService: jest.Mocked<ProfileService>;

  beforeEach(async () => {
    followService = {
      follow: jest.fn(),
      unfollow: jest.fn(),
      isFollowing: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFollowersCount: jest.fn(),
      getFollowingCount: jest.fn(),
    } as unknown as jest.Mocked<FollowService>;

    profileService = {
      findByUserId: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowResolver,
        { provide: FollowService, useValue: followService },
        { provide: ProfileService, useValue: profileService },
      ],
    }).compile();

    resolver = module.get<FollowResolver>(FollowResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // followProfile
  // ──────────────────────────────────────────────
  describe('followProfile', () => {
    it('delega ao followService.follow com me.id e profileId', async () => {
      const fakeFollow = { followerId: 'prof-A', followingId: 'prof-B', createdAt: new Date() };
      followService.follow.mockResolvedValueOnce(fakeFollow as any);

      const result = await resolver.followProfile('prof-B', { id: 'user-A' } as any);

      expect(followService.follow).toHaveBeenCalledWith('user-A', 'prof-B');
      expect(result).toEqual(fakeFollow);
    });

    it('nunca usa userId do cliente — usa apenas me.id do JWT', async () => {
      followService.follow.mockResolvedValueOnce({} as any);

      await resolver.followProfile('prof-X', { id: 'auth-user' } as any);

      expect(followService.follow).toHaveBeenCalledWith('auth-user', 'prof-X');
    });
  });

  // ──────────────────────────────────────────────
  // unfollowProfile
  // ──────────────────────────────────────────────
  describe('unfollowProfile', () => {
    it('delega ao followService.unfollow e retorna true', async () => {
      followService.unfollow.mockResolvedValueOnce(true);

      const result = await resolver.unfollowProfile('prof-B', { id: 'user-A' } as any);

      expect(followService.unfollow).toHaveBeenCalledWith('user-A', 'prof-B');
      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // myFollowers
  // ──────────────────────────────────────────────
  describe('myFollowers', () => {
    it('resolve o profile do usuário autenticado e retorna lista paginada de seguidores', async () => {
      const fakeProfile = { id: 'prof-A', userId: 'user-A' };
      profileService.findByUserId.mockResolvedValueOnce(fakeProfile as any);
      const fakeResult = { profiles: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      followService.getFollowers.mockResolvedValueOnce(fakeResult as any);

      const result = await resolver.myFollowers({ id: 'user-A' } as any, 1, 10);

      expect(profileService.findByUserId).toHaveBeenCalledWith('user-A');
      expect(followService.getFollowers).toHaveBeenCalledWith('prof-A', 1, 10);
      expect(result).toEqual(fakeResult);
    });

    it('usa page=1 e limit=10 como defaults', async () => {
      profileService.findByUserId.mockResolvedValueOnce({ id: 'prof-A', userId: 'user-A' } as any);
      followService.getFollowers.mockResolvedValueOnce({} as any);

      await resolver.myFollowers({ id: 'user-A' } as any, undefined, undefined);

      expect(followService.getFollowers).toHaveBeenCalledWith('prof-A', 1, 10);
    });
  });

  // ──────────────────────────────────────────────
  // myFollowing
  // ──────────────────────────────────────────────
  describe('myFollowing', () => {
    it('resolve o profile do usuário autenticado e retorna lista paginada de seguidos', async () => {
      const fakeProfile = { id: 'prof-A', userId: 'user-A' };
      profileService.findByUserId.mockResolvedValueOnce(fakeProfile as any);
      const fakeResult = { profiles: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      followService.getFollowing.mockResolvedValueOnce(fakeResult as any);

      const result = await resolver.myFollowing({ id: 'user-A' } as any, 1, 10);

      expect(profileService.findByUserId).toHaveBeenCalledWith('user-A');
      expect(followService.getFollowing).toHaveBeenCalledWith('prof-A', 1, 10);
      expect(result).toEqual(fakeResult);
    });
  });

  // ──────────────────────────────────────────────
  // isFollowing
  // ──────────────────────────────────────────────
  describe('isFollowing', () => {
    it('delega ao followService.isFollowing com me.id e profileId', async () => {
      followService.isFollowing.mockResolvedValueOnce(true);

      const result = await resolver.isFollowing('prof-B', { id: 'user-A' } as any);

      expect(followService.isFollowing).toHaveBeenCalledWith('user-A', 'prof-B');
      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // ResolveFields: followersCount / followingCount
  // ──────────────────────────────────────────────
  describe('followersCount (ResolveField)', () => {
    it('delega ao followService.getFollowersCount usando o parent.id', async () => {
      followService.getFollowersCount.mockResolvedValueOnce(5);

      const result = await resolver.followersCount({ id: 'prof-B' } as any);

      expect(followService.getFollowersCount).toHaveBeenCalledWith('prof-B');
      expect(result).toBe(5);
    });
  });

  describe('followingCount (ResolveField)', () => {
    it('delega ao followService.getFollowingCount usando o parent.id', async () => {
      followService.getFollowingCount.mockResolvedValueOnce(3);

      const result = await resolver.followingCount({ id: 'prof-A' } as any);

      expect(followService.getFollowingCount).toHaveBeenCalledWith('prof-A');
      expect(result).toBe(3);
    });
  });
});
