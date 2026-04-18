import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsResolver } from './posts.resolver';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  providers: [PostsResolver, PostsService],
})
export class PostsModule {}
