import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { UpdateSubscriptionInput } from './dto/update-subscription.input';
import GraphQLJSON from 'graphql-type-json';

@Resolver(() => Subscription)
export class SubscriptionsResolver {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Mutation(() => Subscription)
  createSubscription(@Args('createSubscriptionInput') createSubscriptionInput: CreateSubscriptionInput) {
    return this.subscriptionsService.create(createSubscriptionInput);
  }


  // @Query(() => [Subscription], { name: 'subscriptions' })
  // findAll() {
  //   return this.subscriptionsService.findAll();
  // }

  // @Query(() => Subscription, { name: 'subscription' })
  // findOne(@Args('id', { type: () => Int }) id: number) {
  //   return this.subscriptionsService.findOne(id);
  // }

  // @Mutation(() => Subscription)
  // updateSubscription(@Args('updateSubscriptionInput') updateSubscriptionInput: UpdateSubscriptionInput) {
  //   return this.subscriptionsService.update(updateSubscriptionInput.id, updateSubscriptionInput);
  // }

  // @Mutation(() => Subscription)
  // removeSubscription(@Args('id', { type: () => Int }) id: number) {
  //   return this.subscriptionsService.remove(id);
  // }
}
