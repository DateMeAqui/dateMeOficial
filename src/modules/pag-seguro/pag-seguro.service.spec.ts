import { Test, TestingModule } from '@nestjs/testing';
import { PagSeguroService } from './pag-seguro.service';

describe('PaymentService', () => {
  let service: PagSeguroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PagSeguroService],
    }).compile();

    service = module.get<PagSeguroService>(PagSeguroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
