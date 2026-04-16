import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class UploadMedia {
  @Field(() => String)
  postId: string;

  @Field(() => String, { nullable: true })
  isVideo?: string;
}
