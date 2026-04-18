import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MediaKind = 'image' | 'video';

export interface RecordUploadInput {
  ownerId: string;
  kind: MediaKind;
  url: string;
  filename: string;
}

export interface ResolvedMediaUrls {
  imageUrls: string[];
  videoUrl?: string;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async recordUpload(input: RecordUploadInput) {
    return this.prisma.media.create({ data: input });
  }

  async assertOwnership(mediaIds: string[], userId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    const rows = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, ownerId: true, attachedAt: true },
    });
    if (rows.length !== mediaIds.length) {
      throw new ForbiddenException('One or more media not found.');
    }
    for (const row of rows) {
      if (row.ownerId !== userId) {
        throw new ForbiddenException('Media does not belong to user.');
      }
      if (row.attachedAt !== null) {
        throw new ForbiddenException('Media already attached to another entity.');
      }
    }
  }

  async attachToPost(mediaIds: string[], postId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    await this.prisma.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { postId, attachedAt: new Date() },
    });
  }

  async attachToComment(mediaIds: string[], commentId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    await this.prisma.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { commentId, attachedAt: new Date() },
    });
  }

  async attachToUserAvatar(mediaId: string, userId: string): Promise<string> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new ForbiddenException('Media not found.');
    if (media.kind !== 'image') throw new BadRequestException('Avatar must be an image.');
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { userAvatarId: userId, attachedAt: new Date() },
    });
    return media.url;
  }

  async attachToGalleryPhoto(mediaId: string, photoId: string): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { photoId, attachedAt: new Date() },
    });
  }

  async resolveUrls(mediaIds: string[]): Promise<ResolvedMediaUrls> {
    if (mediaIds.length === 0) return { imageUrls: [], videoUrl: undefined };
    const rows = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, url: true, kind: true },
    });
    const imageUrls = rows.filter((r) => r.kind === 'image').map((r) => r.url);
    const videos = rows.filter((r) => r.kind === 'video');
    if (videos.length > 1) throw new BadRequestException('Only one video per post.');
    return { imageUrls, videoUrl: videos[0]?.url };
  }
}
