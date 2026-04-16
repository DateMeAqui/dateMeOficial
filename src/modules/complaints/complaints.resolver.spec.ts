import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintsResolver } from './complaints.resolver';
import { ComplaintsService } from './complaints.service';

describe('ComplaintsResolver', () => {
  let resolver: ComplaintsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplaintsResolver, ComplaintsService],
    }).compile();

    resolver = module.get<ComplaintsResolver>(ComplaintsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
