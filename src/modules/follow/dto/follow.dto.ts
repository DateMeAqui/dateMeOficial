import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Follow')
export class FollowDTO {
  @Field(() => ID)
  followerId: string;

  @Field(() => ID)
  followingId: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}
