import { Test, TestingModule } from '@nestjs/testing';
import { ReportingResolver } from './reporting.resolver';
import { ReportingService } from './reporting.service';

describe('ReportingResolver', () => {
  let resolver: ReportingResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportingResolver, ReportingService],
    }).compile();

    resolver = module.get<ReportingResolver>(ReportingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
