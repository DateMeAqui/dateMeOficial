import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateReportingInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
