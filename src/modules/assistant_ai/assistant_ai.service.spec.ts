import { Test, TestingModule } from '@nestjs/testing';
import { AssistantAiService } from './assistant_ai.service';

describe('AssistantAiService', () => {
  let service: AssistantAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssistantAiService],
    }).compile();

    service = module.get<AssistantAiService>(AssistantAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
