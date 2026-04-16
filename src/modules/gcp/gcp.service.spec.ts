import { Test, TestingModule } from '@nestjs/testing';
import { GcpService } from './gcp.service';

describe('GcpService', () => {
  let service: GcpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GcpService],
    }).compile();

    service = module.get<GcpService>(GcpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
