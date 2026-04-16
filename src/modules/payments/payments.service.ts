import { Injectable } from '@nestjs/common';
import { CreatePaymentInput } from './dto/create-payment.input';
import { UpdatePaymentInput } from './dto/update-payment.input';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderBoletoDTO } from '../pag-seguro/dto/create-order-boleto.dto';
import { subscribe } from 'diagnostics_channel';
import { FactoryMehtodPaymnet } from './factory/factorymethod-paymnet';

@Injectable()
export class PaymentsService {

  constructor(
    private prisma: PrismaService,
  ){}

  async createPaymentDataRaw(data: any){

    const subscription = await this.prisma.subscription.findUniqueOrThrow({
      where:{
        id: data.reference_id
      }
    })
    console.log(JSON.stringify(data, null, 2))
    const paymentMethodFactory = data.qr_codes?.[0]?.expiration_date
    ? 'PIX'
    : data.charges?.[0]?.payment_method?.type;
    
    console.log(paymentMethodFactory)
    const dataOrderByTypePayment = await FactoryMehtodPaymnet
      .getFactory(paymentMethodFactory)
      .generate(data);
    const dataPayment: CreatePaymentInput = {
      ...dataOrderByTypePayment,
      subscriptionId: data.reference_id,
      orderId: data.id,
      userId: subscription.userId,
      planId: subscription.planId,

    }
    console.log(dataPayment)
    const newPayment = await this.prisma.payment.create({
      data:dataPayment
    })
  }
}
