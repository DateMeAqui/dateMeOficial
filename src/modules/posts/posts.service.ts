import { Injectable } from '@nestjs/common';
import { CreatePostInput } from './dto/create-post.input';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async create(createPostInput: CreatePostInput) {
    const { mediaIds = [], ...rest } = createPostInput;
    await this.mediaService.assertOwnership(mediaIds, rest.authorId);
    const { imageUrls, videoUrl } = await this.mediaService.resolveUrls(mediaIds);

    const post = await this.prisma.post.create({
      data: {
        content: rest.content,
        authorId: rest.authorId,
        imageUrl: imageUrls,
        videoUrl,
      },
    });

    await this.mediaService.attachToPost(mediaIds, post.id);
    return post;
  }

  findAll() {
    return this.prisma.post.findMany({ include: { author: true } });
  }

  findOne(id: string) {
    return this.prisma.post.findUnique({ where: { id }, include: { author: true } });
  }

  findByAuthor(authorId: string) {
    return this.prisma.post.findMany({ where: { authorId }, include: { author: true } });
  }
}
