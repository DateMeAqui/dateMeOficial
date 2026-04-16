import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('PlanDTO')
export class PlanDTO {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => Int)
  price: number;

  @Field()
  currency: string;

  @Field({ nullable: true})
  deletedAt?: Date;

  @Field()
  createdAt: Date;

  @Field({ nullable: true})
  updatedAt?: Date;

}
