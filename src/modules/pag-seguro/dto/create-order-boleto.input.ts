import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsObject, IsString, ValidateNested, } from "class-validator";
import { Type } from "class-transformer";
import { ItemsWithReferenceId } from "./common/input/items.input";
import { AddressHolder } from "./common/input/address.input";
import { ShippingInput } from "./common/input/shipping,input";
import { PaymentMethodInput } from "./common/input/payment-method.input";
import { ChargesInput } from "./common/input/charges.input";
import { CustomerInput } from "./common/input/customer.input";

@InputType()
class InstructionLinesInput {
    @Field()
    @IsString()
    line_1: string;

    @Field()
    @IsString()
    line_2: string;

}

@InputType()
class HolderBoletoInput {
    @Field({description:"Nome do proprietario do cartão"})
    @IsString()
    name: string;

    @Field({description: "cpf do proprietario"})
    @IsString()
    tax_id: string;

    @Field({description: "email do proprietario"})
    @IsString()
    email: string;

    @Field(() => AddressHolder)
    @IsObject()
    address: AddressHolder;
}

@InputType()
class BoletoInput {
    @Field({description: "exemplo: 2023-06-20"})
    @IsString()
    due_date: string;

    @Field(() => InstructionLinesInput)
    @IsObject()
    instruction_lines: InstructionLinesInput;

    @Field(() => HolderBoletoInput)
    @IsObject()
    holder: HolderBoletoInput;
}



@InputType()
class PaymentMethodBoleto extends PaymentMethodInput{
    @Field(() => BoletoInput)
    @IsObject()
    boleto: BoletoInput;

   

}

@InputType()
class ChargesBoleto extends ChargesInput{
    @Field(() => PaymentMethodBoleto)
    @IsObject()
    payment_method: PaymentMethodBoleto
}

@InputType()
export class CreateOrderBoletoInput {
    @Field(() => String)
    @IsString()
    reference_id: string;

    @Field(() => CustomerInput)
    @IsObject()
    customer: CustomerInput;

    @Field(() => [ItemsWithReferenceId])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemsWithReferenceId)
    items: ItemsWithReferenceId[];

    @Field(() => [ChargesBoleto])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChargesBoleto)
    charges: ChargesBoleto[];

    @Field(() => ShippingInput)
    @IsObject()
    shipping: ShippingInput;

    // @Field(() => [String])
    // @IsArray()
    // notification_urls: string[]; 
}