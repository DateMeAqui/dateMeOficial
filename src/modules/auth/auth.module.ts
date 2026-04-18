import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthResolver } from './auth.resolver';
import { redisStore } from 'cache-manager-redis-yet';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GqlAuthGuard } from './guards/qgl-auth.guard';
import { JwtRestAuthGuard } from './guards/jwt-rest-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m'}
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get<string>('REDIS_PRIVATE_URL'),
          ttl: 0 // sem expiração automática, você controla manualmente
        }),
      }),
      isGlobal: true // cache disponível em toda a aplicação
    }),
  ],
   providers: [
    JwtAuthGuard,
    GqlAuthGuard,
    JwtRestAuthGuard,
    JwtStrategy,
    AuthService,
    AuthResolver,
  ],
  exports: [JwtModule, PassportModule, JwtAuthGuard, GqlAuthGuard, JwtRestAuthGuard, AuthService],
})
export class AuthModule {}
