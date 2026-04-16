import { Field, InputType } from "@nestjs/graphql";
import { IsObject, IsString } from "class-validator";
import { AmountWithCurrencyInput } from "./amount.input";

@InputType()
export class ChargesInput {
    @Field()
    @IsString()
    reference_id:  string;

    @Field()
    @IsString()
    description:  string;

    @Field(() => AmountWithCurrencyInput)
    @IsObject()
    amount: AmountWithCurrencyInput
}