import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UploadResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  fileUrl?: string;

  @Field(() => [String], { nullable: true })
  fileUrls?: string[];

  @Field(() => ID, { nullable: true })
  mediaId?: string;

  @Field(() => [ID], { nullable: true })
  mediaIds?: string[];
}
