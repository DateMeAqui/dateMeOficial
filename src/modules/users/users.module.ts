import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { AddressesModule } from '../addresses/addresses.module';
import { CalculateDateBrazilNow } from 'src/utils/calculate_date_brazil_now';
import { ProfileModule } from '../profile/profile.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [PrismaModule, SmsModule, AddressesModule, ProfileModule, ConfigModule],
  providers: [
    UsersResolver,
    UsersService,
    CalculateDateBrazilNow,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_PRIVATE_URL') as string);
      },
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
