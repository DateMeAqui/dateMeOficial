import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsResolver } from './subscriptions.resolver';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsResolver', () => {
  let resolver: SubscriptionsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionsResolver, SubscriptionsService],
    }).compile();

    resolver = module.get<SubscriptionsResolver>(SubscriptionsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
