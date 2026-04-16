import { Field, ObjectType } from "@nestjs/graphql";
import { PhonesDTO } from "./phones.dto";

@ObjectType()
export class CustomerDTO {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  tax_id: string;

  @Field(() => [PhonesDTO])
  phones: PhonesDTO[];
}