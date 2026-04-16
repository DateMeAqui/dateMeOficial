import { InputType, Int, Field } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsString()
  content: string;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  imageUrl?: string[];

  @Field({ nullable: true })
  @IsString()
  videoUrl?: string;

  // @Field(() => Comment, { nullable: true })
  // comments?: Comment[];


  authorId!: string; 

 
}
