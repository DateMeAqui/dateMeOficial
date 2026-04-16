import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateAssistantAiInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
