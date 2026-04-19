import { Test, TestingModule } from '@nestjs/testing';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';
import { Gender } from './enums/gender.enum';

describe('ProfileResolver', () => {
  let resolver: ProfileResolver;
  let profileService: jest.Mocked<ProfileService>;

  beforeEach(async () => {
    profileService = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileResolver,
        { provide: ProfileService, useValue: profileService },
      ],
    }).compile();

    resolver = module.get<ProfileResolver>(ProfileResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('myProfile', () => {
    it('resolves using me.id from the current user', async () => {
      const fake = { id: 'p1', userId: 'u1' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.myProfile({ id: 'u1' } as any);

      expect(profileService.findByUserId).toHaveBeenCalledWith('u1');
      expect(result).toEqual(fake);
    });
  });

  describe('getProfileByUserId', () => {
    it('resolves using the userId argument', async () => {
      const fake = { id: 'p2', userId: 'u2' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.getProfileByUserId('u2');

      expect(profileService.findByUserId).toHaveBeenCalledWith('u2');
      expect(result).toEqual(fake);
    });
  });

  describe('updateMyProfile', () => {
    it('updates using me.id and the input', async () => {
      const updated = { id: 'p1', userId: 'u1', bio: 'new bio' };
      profileService.updateByUserId.mockResolvedValueOnce(updated as any);

      const input = { bio: 'new bio' };
      const result = await resolver.updateMyProfile(input, { id: 'u1' } as any);

      expect(profileService.updateByUserId).toHaveBeenCalledWith('u1', input);
      expect(result).toEqual(updated);
    });

    it('never uses an external userId from the client', async () => {
      profileService.updateByUserId.mockResolvedValueOnce({} as any);

      await resolver.updateMyProfile(
        { gender: Gender.WOMAN } as any,
        { id: 'auth-user' } as any,
      );

      expect(profileService.updateByUserId).toHaveBeenCalledWith(
        'auth-user',
        { gender: Gender.WOMAN },
      );
    });
  });

  describe('getProfile (field resolver)', () => {
    it('delegates to findByUserId using the parent user id', async () => {
      const fake = { id: 'p1', userId: 'u1' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.getProfile({ id: 'u1' } as any);

      expect(profileService.findByUserId).toHaveBeenCalledWith('u1');
      expect(result).toEqual(fake);
    });
  });
});
