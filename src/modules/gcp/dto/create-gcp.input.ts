import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateGcpInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
