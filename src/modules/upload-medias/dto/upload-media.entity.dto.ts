import { ObjectType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@ObjectType()
export class UploadMedia {
  @Field(() => String)
  postId: string;

  @Field(() => String, { nullable: true })
  @Type(() => String)
  isVideo?: string;
}
