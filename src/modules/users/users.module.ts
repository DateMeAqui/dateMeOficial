import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { AddressesModule } from '../addresses/addresses.module';
import { CalculateDateBrazilNow } from 'src/utils/calculate_date_brazil_now';

@Module({
  imports: [PrismaModule, SmsModule, AddressesModule],
  providers: [UsersResolver, UsersService, CalculateDateBrazilNow],
  exports:[UsersService]
})
export class UsersModule {}
