import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsResolver } from './subscriptions.resolver';
import { CalculateDateBrazilNow } from 'src/utils/calculate_date_brazil_now';

@Module({
  providers: [SubscriptionsResolver, SubscriptionsService, CalculateDateBrazilNow],
})
export class SubscriptionsModule {}
