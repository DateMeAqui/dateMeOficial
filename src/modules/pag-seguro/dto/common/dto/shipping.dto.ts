import { Field, ObjectType } from "@nestjs/graphql";
import { AddressPagSeguroDTO } from "./address.dto";

@ObjectType()
export class ShippingDTO {
  @Field()
  address: AddressPagSeguroDTO;
}