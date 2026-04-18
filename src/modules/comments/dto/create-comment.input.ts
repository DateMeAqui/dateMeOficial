import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

@InputType()
export class CreateCommentInput {
  @Field(() => ID)
  @IsUUID()
  postId: string;

  @Field()
  @IsString()
  content: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];
}
