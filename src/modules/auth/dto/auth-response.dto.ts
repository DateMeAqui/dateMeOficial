import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/modules/users/dto/user.dto';

@ObjectType()
export class AuthResponse {
  @Field()
  access_token: string;

  @Field()
  refreshToken: string;

  @Field(() => User)
  user: User;
}
