import { Field, InputType } from "@nestjs/graphql";
import { AddressShipping } from "./address.input";
import { IsObject } from "class-validator";

@InputType()
export class ShippingInput {
    @Field(() => AddressShipping)
    @IsObject()
    address: AddressShipping;
}