import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from '../enums/gender.enum';

@ObjectType('Profile')
export class ProfileDTO {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => Gender)
  gender: Gender;

  @Field(() => [Gender])
  preferences: Gender[];

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date | null;
}
