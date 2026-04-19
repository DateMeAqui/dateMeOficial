import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { unlink } from 'fs/promises';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: { unlink: (path: string) => Promise<void> } = { unlink },
  ) {}

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

  async attachToProfileAvatar(mediaId: string, profileId: string): Promise<string> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new ForbiddenException('Media not found.');
    if (media.kind !== 'image') throw new BadRequestException('Avatar must be an image.');
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { profileAvatarId: profileId, attachedAt: new Date() },
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

  async addGalleryPhoto(mediaId: string, userId: string) {
    const rows = await this.prisma.media.findMany({
      where: { id: { in: [mediaId] } },
      select: { id: true, ownerId: true, attachedAt: true, url: true, kind: true },
    });
    if (rows.length === 0) throw new ForbiddenException('Media not found.');
    const media = rows[0];
    if (media.ownerId !== userId) throw new ForbiddenException('Media not owned.');
    if (media.attachedAt) throw new ForbiddenException('Media already attached.');
    if (media.kind !== 'image') throw new BadRequestException('Gallery accepts images only.');

    const photo = await this.prisma.photo.create({
      data: { url: media.url, userId },
    });
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { photoId: photo.id, attachedAt: new Date() },
    });
    return photo;
  }

  async removeGalleryPhoto(photoId: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new ForbiddenException('Photo not found.');
    if (photo.userId !== userId) throw new ForbiddenException('Photo not owned.');
    await this.prisma.photo.delete({ where: { id: photoId } });
  }

  async listGalleryPhotos(userId: string) {
    return this.prisma.photo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOrphans(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const orphans = await this.prisma.media.findMany({
      where: {
        attachedAt: null,
        postId: null,
        commentId: null,
        photoId: null,
        profileAvatarId: null,
        createdAt: { lt: oneHourAgo },
      },
      select: { id: true, filename: true },
    });

    if (orphans.length === 0) return 0;

    await Promise.all(
      orphans.map((m) =>
        this.fs.unlink(`uploads/${m.filename}`).catch(() => undefined),
      ),
    );

    const ids = orphans.map((m) => m.id);
    await this.prisma.media.deleteMany({ where: { id: { in: ids } } });
    return orphans.length;
  }
}
