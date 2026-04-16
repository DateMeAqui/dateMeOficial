import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Post } from 'src/modules/posts/entities/post.entity';
import { AppraiserEnum } from '../enum/appraiser.enum';

@ObjectType()
export class Complaint {
  @Field(() => String)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  postId: string;

  @Field(() => Post)
  post: Post;

  @Field(() => AppraiserEnum, { description: "Defines who made the appraisal: assistant or human", nullable: true })
  appraiser?: AppraiserEnum;

  @Field({ nullable: true })
  analyzed?: boolean;

  @Field({ nullable: true })
  responseAnalysis?: string;
  
  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "updated_at"})
  updatedAt?: Date;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

}
