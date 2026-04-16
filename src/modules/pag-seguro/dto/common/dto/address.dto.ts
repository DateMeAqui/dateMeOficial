import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AddressPagSeguroDTO {
  @Field()
  street: string;

  @Field()
  number: string;

  @Field({ nullable: true })
  complement?: string;

  @Field()
  locality: string;

  @Field()
  city: string;

  @Field()
  region_code: string;

  @Field({ nullable: true })
  region?: string;

  @Field()
  country: string;

  @Field()
  postal_code: string;
}