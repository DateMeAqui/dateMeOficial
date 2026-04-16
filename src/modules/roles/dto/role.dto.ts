import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('RoleDTO')
export class Role {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;
}
