import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesWithPagination } from './dto/profiles-with-pagination.dto';

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerUserId: string, followingProfileId: string) {
    const [followerProfile, followingProfile] = await Promise.all([
      this.prisma.profile.findUniqueOrThrow({ where: { userId: followerUserId } }),
      this.prisma.profile.findUniqueOrThrow({ where: { id: followingProfileId } }),
    ]);

    if (followerProfile.id === followingProfile.id) {
      throw new BadRequestException('Você não pode seguir a si mesmo');
    }

    try {
      return await this.prisma.follow.create({
        data: { followerId: followerProfile.id, followingId: followingProfile.id },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Você já segue este perfil');
      }
      throw err;
    }
  }

  async unfollow(followerUserId: string, followingProfileId: string): Promise<boolean> {
    const followerProfile = await this.prisma.profile.findUniqueOrThrow({
      where: { userId: followerUserId },
    });

    await this.prisma.follow.deleteMany({
      where: { followerId: followerProfile.id, followingId: followingProfileId },
    });

    return true;
  }

  async isFollowing(followerUserId: string, followingProfileId: string): Promise<boolean> {
    const followerProfile = await this.prisma.profile.findUniqueOrThrow({
      where: { userId: followerUserId },
    });

    const record = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerProfile.id,
          followingId: followingProfileId,
        },
      },
    });

    return record !== null;
  }

  async getFollowers(profileId: string, page: number, limit: number): Promise<ProfilesWithPagination> {
    const [total, rows] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: profileId } }),
      this.prisma.follow.findMany({
        where: { followingId: profileId },
        include: { follower: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      profiles: rows.map((r) => (r as any).follower),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFollowing(profileId: string, page: number, limit: number): Promise<ProfilesWithPagination> {
    const [total, rows] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: profileId } }),
      this.prisma.follow.findMany({
        where: { followerId: profileId },
        include: { following: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      profiles: rows.map((r) => (r as any).following),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFollowersCount(profileId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followingId: profileId } });
  }

  async getFollowingCount(profileId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followerId: profileId } });
  }
}
