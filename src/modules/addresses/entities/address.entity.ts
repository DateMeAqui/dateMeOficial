import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('Address')
export class Address {
  @Field()
  id: string;

  @Field()
  street: string;

  @Field()
  number: number;

  @Field(() => String, { nullable: true })
  complement?: string | null;

  @Field()
  district: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  cep: string;

  @Field(() => Number, { nullable: true })
  latitude?: number;

  @Field(() => Number, { nullable: true })
  longitude?: number;
}
