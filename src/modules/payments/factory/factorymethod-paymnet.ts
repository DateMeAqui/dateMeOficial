export interface InterfaceResponseDataFormaPayment {
  amount: number;
  currency: string;
  chargesId: string;
  paymentMethod: string;
  paymentDetails: string;
  status: string;
}
 
export abstract class FactoryMehtodPaymnet{

    abstract generate(data: any): Promise<InterfaceResponseDataFormaPayment>;

    static getFactory(methodPayment: string):FactoryMehtodPaymnet{
        if(methodPayment === 'BOLETO') {
            const { ResponseDataBoletoFactory } = require('./response-data-boleto.factory');
            return new ResponseDataBoletoFactory();
        }else if(methodPayment === 'PIX'){
            const { ResponseDataPixFactory } = require('./response-data-pix.factory');
            return new ResponseDataPixFactory();
        }
        throw new Error('Método de pagamento não suportado');
    }
    



}