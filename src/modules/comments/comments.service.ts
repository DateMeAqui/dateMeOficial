import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateCommentInput } from './dto/create-comment.input';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async create(userId: string, input: CreateCommentInput) {
    const mediaIds = input.mediaIds ?? [];
    await this.mediaService.assertOwnership(mediaIds, userId);
    const { imageUrls, videoUrl } = await this.mediaService.resolveUrls(mediaIds);

    const comment = await this.prisma.comment.create({
      data: {
        postId: input.postId,
        content: input.content,
        authorId: userId,
        parentId: input.parentId,
        imageUrl: imageUrls,
        videoUrl,
      },
    });

    await this.mediaService.attachToComment(mediaIds, comment.id);
    return comment;
  }

  findByPost(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: { author: true, replies: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { author: true, replies: true },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new ForbiddenException('Comment not found.');
    if (comment.authorId !== userId) throw new ForbiddenException('Not the author.');
    return this.prisma.comment.delete({ where: { id } });
  }
}
