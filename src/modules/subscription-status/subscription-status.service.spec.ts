import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionStatusService } from './subscription-status.service';

describe('SubscriptionStatusService', () => {
  let service: SubscriptionStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionStatusService],
    }).compile();

    service = module.get<SubscriptionStatusService>(SubscriptionStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
