import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PubSub } from '@google-cloud/pubsub';

export const PUBSUB_CLIENT = "PUBSUB_CLIENT"

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PUBSUB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get('GCP_PROJECT_ID');
        const keyFilename = configService.get('GOOGLE_APPLICATION_CREDENTIALS');
        
        if (!projectId) {
          throw new Error('GCP_PROJECT_ID não definido no .env');
        }
        
        const options: any = { projectId };
        if (keyFilename) {
          options.keyFilename = keyFilename;
        }
        
        return new PubSub(options);
      },
      inject: [ConfigService]
    },
  ],
  exports: [PUBSUB_CLIENT]
})
export class GcpModule {}
