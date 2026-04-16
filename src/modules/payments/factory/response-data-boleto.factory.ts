import { FactoryMehtodPaymnet, InterfaceResponseDataFormaPayment } from "./factorymethod-paymnet";

export class ResponseDataBoletoFactory extends FactoryMehtodPaymnet {
    async generate(data: any): Promise<InterfaceResponseDataFormaPayment> {
        return {
            amount: data.charges[0].amount.value,
            paymentMethod: data.charges[0].payment_method.type,
            paymentDetails: JSON.stringify(data),
            currency: data.charges[0].amount.currency,
            chargesId: data.charges[0].id,
            status: data.charges[0].status,
        }
    }
}