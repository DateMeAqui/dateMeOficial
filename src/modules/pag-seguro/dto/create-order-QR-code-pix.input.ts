import { Field, InputType,  } from "@nestjs/graphql";
import { IsArray, IsInt, IsObject, IsString, ValidateNested, } from "class-validator";

import { Type } from "class-transformer";
import { CustomerInput } from "./common/input/customer.input";
import { ItemsInput } from "./common/input/items.input";
import { ShippingInput } from "./common/input/shipping,input";
import { AmountInput } from "./common/input/amount.input";

@InputType()
class QrCodes {
    @Field(() => AmountInput)
    @IsObject()
    amount: AmountInput;

    @Field(() => String)
    @IsString()
    expiration_date: string;
}

@InputType()
export class CreateOrderQRCodePixInput {
    @Field(() => String)
    @IsString()
    reference_id: string;

    @Field(() => CustomerInput)
    @IsObject()
    customer: CustomerInput;

    @Field(() => [ItemsInput])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemsInput)
    items: ItemsInput[];

    @Field(() => [QrCodes])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QrCodes)
    qr_codes: QrCodes[];

    @Field(() => ShippingInput)
    @IsObject()
    shipping: ShippingInput;

    // @Field(() => [String])
    // @IsArray()
    // notification_urls: string[]; 
}