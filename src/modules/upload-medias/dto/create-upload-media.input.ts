import { InputType, Int, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@InputType()
export class CreateUploadMediaInput {
  @Field(() => String)
  postId: string;

  @Field(() => String, { nullable: true })
  @Type(() => String)
  isVideo?: string;
}
