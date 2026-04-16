import { Test, TestingModule } from '@nestjs/testing';
import { PagSeguroResolver } from './pag-seguro.resolver';
import { PagSeguroService } from './pag-seguro.service';

describe('PaymentResolver', () => {
  let resolver: PagSeguroResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PagSeguroResolver, PagSeguroService],
    }).compile();

    resolver = module.get<PagSeguroResolver>(PagSeguroResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
