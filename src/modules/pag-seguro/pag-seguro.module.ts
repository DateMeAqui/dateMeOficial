import { Module } from '@nestjs/common';
import { PagSeguroService } from './pag-seguro.service';
import { PagSeguroResolver } from './pag-seguro.resolver';
import { PagSeguroController } from './pag-seguro.controller';
import { PagSeguroAPI } from './pagseguro-api';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../payments/payments.service';

@Module({
  providers: [
    PagSeguroResolver, 
    PagSeguroService,
    PaymentsService,
    {
      provide: PagSeguroAPI,
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('TOKEN_PAGSEGURO') ?? '';
        const urlBase = configService.get<string>('URL_BASE') ?? '';
        return new PagSeguroAPI(token, urlBase);
      },
      inject: [ConfigService],
    }
  ],
  controllers: [PagSeguroController],
  exports:[ PagSeguroService]
})
export class PagSeguroModule {}
