import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionStatusResolver } from './subscription-status.resolver';
import { SubscriptionStatusService } from './subscription-status.service';

describe('SubscriptionStatusResolver', () => {
  let resolver: SubscriptionStatusResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionStatusResolver, SubscriptionStatusService],
    }).compile();

    resolver = module.get<SubscriptionStatusResolver>(SubscriptionStatusResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
