import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { PagSeguroService } from './pag-seguro.service';
import { CreateAndPaymentOrderWithCardInput } from './dto/create-and-payment-order-with-card.input';
import { OrderWithCardDTO } from './dto/create-and-payment-order-with-card.dto';
import { CreateOrderQRCodePixInput } from './dto/create-order-QR-code-pix.input';
import { CreateOrderQRCodePixDTO } from './dto/create-order-QR-code-pix.dto';
import { GraphQLJSON } from 'graphql-type-json'
import { CreateOrderBoletoInput } from './dto/create-order-boleto.input';
import { CreateOrderInput } from './dto/create-order.input';

@Resolver()
export class PagSeguroResolver {
  constructor(private readonly pagSeguroService: PagSeguroService) {}


  @Mutation(() => GraphQLJSON, {
    description: 'cria e paga um pedido'
  })
  createAndPaymentOrder(
    @Args('create')create: CreateOrderInput
  ) {
    return this.pagSeguroService.createAndPaymentOrder(create);
  }

  @Query(() => GraphQLJSON)
  consultOrderById(
    @Args('id') id: string
  ){
    return this.pagSeguroService.consultOrder(id);
  }

  @Mutation(() => GraphQLJSON)
  payOrderById(
    @Args('id') id: string
  ){
    return this.pagSeguroService.naoSeiOrder(id);
  }
}
