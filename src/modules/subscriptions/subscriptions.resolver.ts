import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Subscription)
export class SubscriptionsResolver {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Subscription)
  createSubscription(
    @CurrentUser() me: { id: string },
    @Args('createSubscriptionInput') input: CreateSubscriptionInput,
  ) {
    input.userId = me.id; // nunca aceitar userId externo
    return this.subscriptionsService.create(input);
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
