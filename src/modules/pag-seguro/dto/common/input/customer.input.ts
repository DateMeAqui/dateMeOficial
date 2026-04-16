import { Field, InputType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsString, ValidateNested } from "class-validator";
import { PhoneInput } from "./phones.input";

@InputType()
export class CustomerInput {
    @Field()
    @IsString()
    name: string;

    @Field()
    @IsString()
    email: string;

    @Field({description:'CPF/CNPJ'})
    @IsString()
    tax_id: string;

    @Field(() => [PhoneInput])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PhoneInput)
    phones: PhoneInput[];
}