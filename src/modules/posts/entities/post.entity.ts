import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Comment } from 'src/modules/comments/entities/comment.entity';
import { Complaint } from 'src/modules/complaints/entities/complaint.entity';
import { User } from 'src/modules/users/entities/user.entity';

@ObjectType()
export class Post {
  
  @Field()
  id: string;
  
  @Field()
  content: string;

  @Field(() => [String], { nullable: true })
  imageUrl?: string[];

  @Field({ nullable: true })
  videoUrl: string;

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => Int)
  commentsCount: number;

  @Field()
  authorId: string; 

  @Field(() => User)
  author: User;

  @Field()
  deletedStatus: boolean;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "updated_at"})
  updatedAt?: Date;

  @Field()
  reportedPublication: boolean;

  @Field(() => [Complaint])
  complaints: Complaint[];



}
