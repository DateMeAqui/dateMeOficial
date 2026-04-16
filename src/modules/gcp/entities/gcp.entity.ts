import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Gcp {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
