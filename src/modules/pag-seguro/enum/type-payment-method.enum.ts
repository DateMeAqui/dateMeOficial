import { registerEnumType } from "@nestjs/graphql";

export enum TypePaymentMethodEnum {
    CREDIT_CARD='CREDIT_CARD',
    DEBIT_CARD='DEBIT_CARD',
    BOLETO='BOLETO'
}
registerEnumType(TypePaymentMethodEnum, { name: 'TypePaymentMethodEnum'});