import { Test, TestingModule } from '@nestjs/testing';
import { GcpResolver } from './gcp.resolver';
import { GcpService } from './gcp.service';

describe('GcpResolver', () => {
  let resolver: GcpResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GcpResolver, GcpService],
    }).compile();

    resolver = module.get<GcpResolver>(GcpResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
