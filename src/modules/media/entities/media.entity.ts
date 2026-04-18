import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Media {
  @Field(() => ID)
  id: string;

  @Field()
  ownerId: string;

  @Field()
  kind: string;

  @Field()
  url: string;

  @Field()
  filename: string;

  @Field({ nullable: true })
  postId?: string;

  @Field({ nullable: true })
  commentId?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  attachedAt?: Date;
}
