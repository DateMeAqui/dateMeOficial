import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('RoleEntity')
export class Role {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;
}
