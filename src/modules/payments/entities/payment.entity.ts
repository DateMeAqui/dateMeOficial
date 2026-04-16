import { ObjectType, Field, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Plan } from 'src/modules/plans/entities/plan.entity';
import { Subscription } from 'src/modules/subscriptions/entities/subscription.entity';
import { User } from 'src/modules/users/entities/user.entity';

@ObjectType()
export class Payment {
  @Field(() => String)
  id: string;

  @Field(() => Int)
  amount: number;

  @Field({defaultValue: 'BRL'})
  currency: string;

  @Field()
  status: string;

  @Field()
  paymentMethod: string;

  @Field({description: "id do recibo do pagamento do gateway"})
  ordedrId: string;

  @Field()
  chargesId: string

  @Field(() => GraphQLJSON)
  paymentDetails: any;

  @Field()
  userId: string;

  @Field(() => User)
  user: User

  @Field()
  planId: string;

  @Field(() => Plan)
  plan: Plan

  @Field()
  subscriptionId: string;

  @Field(() => Subscription)
  subscription: Subscription

}
