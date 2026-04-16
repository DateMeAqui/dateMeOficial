import { Injectable } from '@nestjs/common';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService
  ) {}
  create(createPostInput: CreatePostInput) {
    return this.prisma.post.create({
      data: createPostInput
    })
  }

  findAll() {
    return this.prisma.post.findMany({
      include: {
        author: true
      }
    });
  }

  findOne(id: string) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true
      }
    });
  }

  findByAuthor(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId },
      include: {
        author: true
      }
    });
  }
}
