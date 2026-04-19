import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Photo {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field()
  profileId: string;

  @Field()
  createdAt: Date;
}
