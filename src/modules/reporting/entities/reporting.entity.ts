import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Reporting {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
