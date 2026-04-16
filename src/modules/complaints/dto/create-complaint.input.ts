import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateComplaintInput {
  
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  reason: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  postId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  commentId?: string;

}
