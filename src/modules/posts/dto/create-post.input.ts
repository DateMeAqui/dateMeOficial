import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsString()
  content: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];

  authorId!: string;
}
