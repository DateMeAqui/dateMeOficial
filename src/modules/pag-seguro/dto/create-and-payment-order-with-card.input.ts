import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsBoolean, IsInt, IsObject, IsString, ValidateNested, } from "class-validator";
import { Type } from "class-transformer";
import { CustomerInput } from "./common/input/customer.input";
import { ItemsWithReferenceId } from "./common/input/items.input";
import { AmountWithCurrencyInput } from "./common/input/amount.input";
import { ShippingInput } from "./common/input/shipping,input";
import { PaymentMethodInput } from "./common/input/payment-method.input";


@InputType()
class CardInput {
    @Field()
    @IsString()
    encrypted: string;

    @Field()
    @IsBoolean()
    store: boolean;
}

@InputType()
class HolderInput {
    @Field({description:"Nome do proprietario do cartão"})
    @IsString()
    name: string;

    @Field({description: "cpf do proprietario"})
    @IsString()
    tax_id: string;
}

@InputType()
class PaymentMethodCredit extends PaymentMethodInput {
    @Field({defaultValue: 1})
    @IsInt()
    installments: number;

    @Field()
    @IsBoolean()
    capture: boolean;

    @Field(() => CardInput)
    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => CardInput)
    card: CardInput;

    @Field(() => HolderInput)
    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => HolderInput)
    holder: HolderInput

}

@InputType()
class ChargesInput {
    @Field()
    @IsString()
    reference_id: string;

    @Field({description: 'texto curto na fatura'})
    @IsString()
    description: string;

    @Field(() => AmountWithCurrencyInput)
    @IsObject()
    @Type(() => AmountWithCurrencyInput)
    amount: AmountWithCurrencyInput;

    @Field(() => PaymentMethodCredit)
    @IsObject()
    @Type(() => PaymentMethodCredit)
    payment_method: PaymentMethodCredit;
}

@InputType()
export class CreateAndPaymentOrderWithCardInput {
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

    @Field(() => ShippingInput)
    @IsObject()
    shipping: ShippingInput;

    // @Field(() => [String])
    // @IsArray()
    // notification_urls: string[]; 

    @Field(() => [ChargesInput])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChargesInput)
    charges: ChargesInput[];
}