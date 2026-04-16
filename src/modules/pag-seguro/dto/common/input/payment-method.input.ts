import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsString } from "class-validator";
import { TypePaymentMethodEnum } from "src/modules/pag-seguro/enum/type-payment-method.enum";

@InputType()
export class PaymentMethodInput {
    @Field(() => TypePaymentMethodEnum)
    @IsEnum(TypePaymentMethodEnum)
    type: TypePaymentMethodEnum;

}