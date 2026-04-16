import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SubscriptionStatus {
  @Field(() => Int)
  id: number;

  @Field()
  slug: string;

  @Field()
  description: string;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "update_at"})
  updatedAt?: Date;
}
