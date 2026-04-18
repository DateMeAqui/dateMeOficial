import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';
import { Gender } from './enums/gender.enum';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaMock = {
      profile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForUser', () => {
    const baseInput = {
      gender: Gender.MAN,
      preferences: [Gender.WOMAN],
    };

    it('creates a profile using the default prisma client when no tx is passed', async () => {
      const fake = { id: 'p1', userId: 'u1', ...baseInput, bio: null };
      (prismaMock.profile.create as jest.Mock).mockResolvedValueOnce(fake);

      const result = await service.createForUser('u1', baseInput);

      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: { userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: undefined },
      });
      expect(result).toEqual(fake);
    });

    it('persists the bio when provided', async () => {
      const input = { ...baseInput, bio: 'hello' };
      (prismaMock.profile.create as jest.Mock).mockResolvedValueOnce({ id: 'p1', userId: 'u1', ...input });

      await service.createForUser('u1', input);

      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: { userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: 'hello' },
      });
    });

    it('uses the transaction client when tx is provided', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'p1' });
      const tx = { profile: { create: txCreate } } as unknown as Prisma.TransactionClient;

      await service.createForUser('u1', baseInput, tx);

      expect(txCreate).toHaveBeenCalledTimes(1);
      expect(prismaMock.profile.create).not.toHaveBeenCalled();
    });

    it('propagates P2002 when a profile already exists for the user', async () => {
      const dupError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`user_id`)',
        { code: 'P2002', clientVersion: '6.15.0' },
      );
      (prismaMock.profile.create as jest.Mock).mockRejectedValueOnce(dupError);

      await expect(service.createForUser('u1', baseInput)).rejects.toBe(dupError);
    });
  });

  describe('findByUserId', () => {
    it('returns the profile when found', async () => {
      const fake = {
        id: 'p1',
        userId: 'u1',
        gender: Gender.WOMAN,
        preferences: [Gender.MAN],
        bio: null,
      };
      (prismaMock.profile.findUnique as jest.Mock).mockResolvedValueOnce(fake);

      const result = await service.findByUserId('u1');

      expect(prismaMock.profile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(result).toEqual(fake);
    });

    it('returns null when no profile exists', async () => {
      (prismaMock.profile.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findByUserId('u1');

      expect(result).toBeNull();
    });
  });

  describe('updateByUserId', () => {
    it('calls prisma.profile.update scoped to userId', async () => {
      const patch = { bio: 'updated bio' };
      const updated = { id: 'p1', userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: 'updated bio' };
      (prismaMock.profile.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await service.updateByUserId('u1', patch);

      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: patch,
      });
      expect(result).toEqual(updated);
    });

    it('propagates P2025 when the profile does not exist', async () => {
      const notFound = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found.',
        { code: 'P2025', clientVersion: '6.15.0' },
      );
      (prismaMock.profile.update as jest.Mock).mockRejectedValueOnce(notFound);

      await expect(
        service.updateByUserId('u1', { bio: 'x' }),
      ).rejects.toBe(notFound);
    });
  });
});
