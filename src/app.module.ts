import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SmsModule } from './modules/sms/sms.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AddressesModule } from './modules/addresses/addresses.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PagSeguroModule } from './modules/pag-seguro/pag-seguro.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SubscriptionStatusModule } from './modules/subscription-status/subscription-status.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RedisModule } from '@nestjs-modules/ioredis'
import { PostsModule } from './modules/posts/posts.module';
import { UploadMediasModule } from './modules/upload-medias/upload-medias.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { AssistantAiModule } from './modules/assistant_ai/assistant_ai.module';
import { CommentsModule } from './modules/comments/comments.module';
import { GcpModule } from './modules/gcp/gcp.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // RedisModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     const host = configService.get<string>('REDIS_HOST');
    //     const port = configService.get<number>('REDIS_PORT');
    //     const password = configService.get<string>('REDIS_PASSWORD');
        
    //     // Monta a URL no formato: redis://:password@host:port
    //     const redisUrl = `redis://:${password}@${host}:${port}`;
        
    //     console.log('>>> Conectando ao RedisLabs em:', host);
        
    //     return {
    //       type: 'single',
    //       url: redisUrl,
    //     };
    //   },
    // }),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      // resolvers: { Upload: GraphQLUpload }, // Temporarily disabled due to graphql-upload compatibility issues
      include: [
        AuthModule, 
        PagSeguroModule,
        PlansModule,
        SubscriptionsModule,
        SubscriptionStatusModule,
        PaymentsModule,
        PostsModule,
        UploadMediasModule,
        ComplaintsModule
      ],
      introspection: true,
      playground: true
    }),
    UsersModule,
    PrismaModule,
    SmsModule,
    AddressesModule,
    RolesModule,
    AuthModule,
    PagSeguroModule,
    PlansModule,
    SubscriptionsModule,
    SubscriptionStatusModule,
    PaymentsModule,
    PostsModule,
    UploadMediasModule,
    ComplaintsModule,
    AssistantAiModule,
    CommentsModule,
    GcpModule,
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}