import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PagSeguroService } from './pag-seguro.service';
import { CreateAndPaymentOrderWithCardInput } from './dto/create-and-payment-order-with-card.input';
import { OrderWithCardDTO } from './dto/create-and-payment-order-with-card.dto';
import { CreateOrderQRCodePixInput } from './dto/create-order-QR-code-pix.input';
import { CreateOrderQRCodePixDTO } from './dto/create-order-QR-code-pix.dto';
import { GraphQLJSON } from 'graphql-type-json'
import { CreateOrderBoletoInput } from './dto/create-order-boleto.input';
import { CreateOrderInput } from './dto/create-order.input';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver()
export class PagSeguroResolver {
  constructor(private readonly pagSeguroService: PagSeguroService) {}


  @UseGuards(GqlAuthGuard)
  @Mutation(() => GraphQLJSON, {
    description: 'cria e paga um pedido'
  })
  createAndPaymentOrder(
    @CurrentUser() _me: { id: string },
    @Args('create')create: CreateOrderInput
  ) {
    return this.pagSeguroService.createAndPaymentOrder(create);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => GraphQLJSON)
  consultOrderById(
    @CurrentUser() _me: { id: string },
    @Args('id') id: string
  ){
    return this.pagSeguroService.consultOrder(id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => GraphQLJSON)
  payOrderById(
    @CurrentUser() _me: { id: string },
    @Args('id') id: string
  ){
    return this.pagSeguroService.naoSeiOrder(id);
  }
}
