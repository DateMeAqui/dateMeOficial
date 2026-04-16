import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ItemsDTO {
  @Field()
  name: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int)
  unit_amount: number;
}