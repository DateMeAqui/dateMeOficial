import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SubscriptionStatusService } from './subscription-status.service';
import { SubscriptionStatus } from './entities/subscription-status.entity';
import { CreateSubscriptionStatusInput } from './dto/create-subscription-status.input';
import { UpdateSubscriptionStatusInput } from './dto/update-subscription-status.input';
import { SubscriptionStatusDTO } from './dto/subscription-status.dto';
import { SubscriptionStatusEnum } from './enum/subscription-status.enum';

@Resolver(() => SubscriptionStatus)
export class SubscriptionStatusResolver {
  constructor(private readonly subscriptionStatusService: SubscriptionStatusService) {}

  @Mutation(() => SubscriptionStatusDTO)
  createSubscriptionStatus(@Args('createSubscriptionStatusInput') createSubscriptionStatusInput: CreateSubscriptionStatusInput) {
    return this.subscriptionStatusService.createSubscriptionStatus(createSubscriptionStatusInput);
  }

  @Query(() => [SubscriptionStatusDTO])
  findAllSubscriptionStatus() {
    return this.subscriptionStatusService.findAllSubscriptionStatus();
  }

  @Query(() => SubscriptionStatus)
  findSubscriptionStatusByName(@Args('slug', { type: () => SubscriptionStatusEnum }) slug: SubscriptionStatusEnum) {
    return this.subscriptionStatusService.findSubscriptionStatusByName(slug);
  }

  @Mutation(() => SubscriptionStatus)
  updateSubscriptionStatus(
    @Args('id') id: number,
    @Args('updateSubscriptionStatusInput') updateSubscriptionStatusInput: UpdateSubscriptionStatusInput
  ) {
    return this.subscriptionStatusService.updateSubscriptionStatus(id, updateSubscriptionStatusInput);
  }

  @Mutation(() => SubscriptionStatus)
  removeSubscriptionStatus(@Args('id', { type: () => Int }) id: number) {
    return this.subscriptionStatusService.removeSubscriptionStatus(id);
  }
}
