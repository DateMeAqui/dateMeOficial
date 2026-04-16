import { Test, TestingModule } from '@nestjs/testing';
import { AssistantAiResolver } from './assistant_ai.resolver';
import { AssistantAiService } from './assistant_ai.service';

describe('AssistantAiResolver', () => {
  let resolver: AssistantAiResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssistantAiResolver, AssistantAiService],
    }).compile();

    resolver = module.get<AssistantAiResolver>(AssistantAiResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
