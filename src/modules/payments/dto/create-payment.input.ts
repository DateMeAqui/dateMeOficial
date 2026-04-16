import { InputType, Int, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreatePaymentInput {
    @Field(() => Int)
    amount: number;
  
    @Field({defaultValue: 'BRL'})
    currency: string;
  
    @Field()
    status: string;
  
    @Field()
    paymentMethod: string;
  
    @Field({description: "id do recibo do pagamento do gateway"})
    orderId: string;
  
    @Field()
    chargesId: string
  
    @Field(() => GraphQLJSON)
    paymentDetails: any;
  
    @Field()
    userId: string;
  
    @Field()
    planId: string;

    @Field()
    subscriptionId: string;
  

}
