import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Plan } from 'src/modules/plans/entities/plan.entity';
import { SubscriptionStatus } from 'src/modules/subscription-status/entities/subscription-status.entity';
import { User } from 'src/modules/users/dto/user.dto';
import { IntervalEnum } from '../enum/interval.enum';

@ObjectType()
export class Subscription {
  @Field()
  id: string;

  @Field({name: "start_date"})
  startDate: Date;

  @Field({name: "end_date"})
  endDate: Date;

  @Field(() => User)
  user: User;

  @Field()
  userId: string;

  @Field(() => Plan)
  plan: Plan;

  @Field()
  planId: string;

  @Field(() => SubscriptionStatus, {description: "macroestado da assinatura (active, canceled, trialing, expired)"})
  status: SubscriptionStatus

  @Field(() => Int)
  statusId: number;

  @Field({description: "flag de disponibilidade operacional (true/false)"})
  isActive: boolean;

  @Field()
  autoRenew: boolean;

  @Field(() => IntervalEnum)
  interval: IntervalEnum;

  @Field(() => Int, {nullable: true})
  amount?: number;

  @Field(() => Int, {nullable: true})
  discount?: number;
  
  @Field({ nullable: true, name: "trial_end"})
  trialEnd: Date;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "update_at"})
  updatedAt?: Date;
}
