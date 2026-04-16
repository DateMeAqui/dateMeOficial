import { FactoryMehtodPaymnet, InterfaceResponseDataFormaPayment } from "./factorymethod-paymnet";

export class ResponseDataPixFactory extends FactoryMehtodPaymnet {
    async generate(data: any): Promise<InterfaceResponseDataFormaPayment> {
        return {
            amount: data.qr_codes[0].amount.value,
            paymentMethod: "PIX",
            paymentDetails: JSON.stringify(data),
            currency: "BRL",
            chargesId: data.qr_codes[0].id,
            status: "WAITING",
        }
    }
}