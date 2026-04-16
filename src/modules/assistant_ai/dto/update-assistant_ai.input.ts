import { CreateAssistantAiInput } from './create-assistant_ai.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateAssistantAiInput extends PartialType(CreateAssistantAiInput) {
  @Field(() => Int)
  id: number;
}
