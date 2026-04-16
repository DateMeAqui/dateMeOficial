import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Comment } from 'src/modules/comments/entities/comment.entity';
import { AppraiserEnum } from '../enum/appraiser.enum';

@ObjectType()
export class Complaint {
  @Field(() => String)
  id: string;

  @Field(() => String)
  reason: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  analysesComplaints?: string;

  @Field(() => AppraiserEnum, { description: "Defines who made the appraisal: assistant or human", nullable: true })
  appraiser?: AppraiserEnum;

  @Field(() => String, { nullable: true })
  postId?: string;

  @Field(() => String, { nullable: true })
  commentId?: string;

  @Field(() => String)
  reporterId: string;

  @Field(() => String)
  reportedUserId: string;

  @Field(() => Post, { nullable: true })
  post?: Post;

  @Field(() => Comment, { nullable: true })
  comment?: Comment;
  
  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "updated_at"})
  updatedAt?: Date;

}
