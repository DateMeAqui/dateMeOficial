import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment)
  createComment(
    @Args('createCommentInput') input: CreateCommentInput,
    @CurrentUser() me,
  ) {
    return this.commentsService.create(me.id, input);
  }

  @Query(() => [Comment], { name: 'commentsByPost' })
  findByPost(@Args('postId', { type: () => ID }) postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Query(() => Comment, { name: 'comment' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.commentsService.findOne(id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment, { name: 'removeComment' })
  remove(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() me,
  ) {
    return this.commentsService.remove(id, me.id);
  }
}
