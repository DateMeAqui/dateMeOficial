import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Complaint } from 'src/modules/complaints/entities/complaint.entity';
import { AppraiserEnum } from 'src/modules/complaints/enum/appraiser.enum';
import { Post } from 'src/modules/posts/entities/post.entity';
import { User } from 'src/modules/users/entities/user.entity';

@ObjectType()
export class Comment {
  @Field(() => String)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => [String])
  imageUrl: string[];

  @Field(() => String, { nullable: true })
  videoUrl?: string;

  @Field(() => String)
  postId: string;

  @Field(() => Post)
  post: Post;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field(() => Comment, { nullable: true })
  parent?: Comment;

  @Field(() => [Comment], { nullable: true })
  replies?: Comment[];

  @Field(() => Int)
  commentsCount: number;

  @Field()
  authorId: string; 

  @Field(() => User)
  author: User;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "updated_at"})
  updatedAt?: Date;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field(() => [Complaint])
  complaints: Complaint[];
}
