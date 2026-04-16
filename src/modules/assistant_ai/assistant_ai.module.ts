import { Module } from '@nestjs/common';
import { AssistantAiService } from './assistant_ai.service';
import { AssistantAiResolver } from './assistant_ai.resolver';
import { Anthropic } from '@anthropic-ai/sdk/client';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    AssistantAiResolver, 
    AssistantAiService,
    {
      provide: Anthropic,
      useFactory: (configService: ConfigService) => {
        return new Anthropic({
          apiKey: configService.get<string>('ANTHROPIC_API_KEY'),
        });
      },
      inject: [ConfigService],
    }
  ],
})
export class AssistantAiModule {}
