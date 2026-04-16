import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Plan {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => Int)
  price: number;

  @Field(() =>Boolean, {defaultValue: true})
  isActive: boolean;

  @Field()
  currency: string;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "update_at"})
  updatedAt?: Date;
}