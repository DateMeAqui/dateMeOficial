import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CreateProfileInput } from './dto/create-profile.input';
import { UpdateProfileInput } from './dto/update-profile.input';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  createForUser(
    userId: string,
    input: CreateProfileInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.profile.create({
      data: {
        userId,
        gender: input.gender,
        preferences: input.preferences,
        bio: input.bio,
      },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  updateByUserId(userId: string, input: UpdateProfileInput) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        gender: input.gender,
        preferences: input.preferences,
        bio: input.bio,
      },
    });
  }

  async updateAvatar(userId: string, mediaId: string) {
    const profile = await this.prisma.profile.findUniqueOrThrow({ where: { userId } });
    const url = await this.mediaService.attachToProfileAvatar(mediaId, profile.id);
    return this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl: url, avatarMediaId: mediaId },
    });
  }
}
