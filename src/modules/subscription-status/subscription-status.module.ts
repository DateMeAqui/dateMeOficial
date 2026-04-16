import { Module } from '@nestjs/common';
import { SubscriptionStatusService } from './subscription-status.service';
import { SubscriptionStatusResolver } from './subscription-status.resolver';

@Module({
  providers: [SubscriptionStatusResolver, SubscriptionStatusService],
})
export class SubscriptionStatusModule {}
