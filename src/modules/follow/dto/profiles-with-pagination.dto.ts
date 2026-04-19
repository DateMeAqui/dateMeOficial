import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ProfileDTO } from '../../profile/dto/profile.dto';

@ObjectType()
export class ProfilesWithPagination {
  @Field(() => [ProfileDTO])
  profiles: ProfileDTO[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
