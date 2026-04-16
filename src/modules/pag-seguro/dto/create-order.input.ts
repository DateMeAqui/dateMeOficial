import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsObject, IsOptional, IsString, ValidateNested, } from "class-validator";
import { Type } from "class-transformer";
import { ItemsWithReferenceId } from "./common/input/items.input";
import { AddressHolder } from "./common/input/address.input";
import { ShippingInput } from "./common/input/shipping,input";
import { PaymentMethodInput } from "./common/input/payment-method.input";
import { ChargesInput } from "./common/input/charges.input";
import { CustomerInput } from "./common/input/customer.input";
import { CreateOrderBoletoInput } from "./create-order-boleto.input";
import { CreateOrderQRCodePixInput } from "./create-order-QR-code-pix.input";
import { CreateAndPaymentOrderWithCardInput } from "./create-and-payment-order-with-card.input";



@InputType()
export class CreateOrderInput {
    @Field(() => CreateOrderBoletoInput, {nullable: true})
    @IsObject()
    @IsOptional()
    boleto?: CreateOrderBoletoInput;

    @Field(() => CreateAndPaymentOrderWithCardInput, {nullable: true})
    @IsObject()
    @IsOptional()
    cardCredit?: CreateAndPaymentOrderWithCardInput;

    @Field(() => CreateOrderQRCodePixInput, {nullable: true})
    @IsObject()
    @IsOptional()
    pix?: CreateOrderQRCodePixInput;
}