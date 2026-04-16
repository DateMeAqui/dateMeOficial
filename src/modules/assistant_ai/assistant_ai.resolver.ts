import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AssistantAiService } from './assistant_ai.service';
import { AssistantAi } from './entities/assistant_ai.entity';
import { CreateAssistantAiInput } from './dto/create-assistant_ai.input';
import { UpdateAssistantAiInput } from './dto/update-assistant_ai.input';

@Resolver(() => AssistantAi)
export class AssistantAiResolver {
  constructor(private readonly assistantAiService: AssistantAiService) {}

  // @Mutation(() => AssistantAi)
  // createAssistantAi(@Args('createAssistantAiInput') createAssistantAiInput: CreateAssistantAiInput) {
  //   return this.assistantAiService.create(createAssistantAiInput);
  // }

  
}
