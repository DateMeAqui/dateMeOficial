import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PhonesDTO {
  @Field()
  type: string;

  @Field()
  country: string;

  @Field()
  area: string;

  @Field()
  number: string;
}