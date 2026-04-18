import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Address } from 'src/modules/addresses/entities/address.entity';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Comment } from 'src/modules/comments/entities/comment.entity';

@ObjectType('UserEntity')
export class User {
  @Field()
  id: string;

  @Field()
  fullName: string;

  @Field()
  nickName: string

  @Field({nullable: false})
  email: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field()
  password: string;

  @Field()
  smartphone: string

  @Field({ nullable: true })
  resetPasswordToken?: string;

  @Field()
  birthdate: Date;

  @Field()
  cpf: string;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "update_at"})
  updatedAt?: Date;

  @Field()
  status: string;

  @Field()
  verificationCode: number;

  @Field()
  isOnline: boolean;

  @Field({ nullable: true})
  lastLogin?: Date;

  @Field(() => Address, { nullable: true })
  address?: Address;

  @Field(() => Role)
  role: Role;

  @Field(() => Int)
  roleId: number;

  @Field(() => [Post], { nullable: true })
  posts?: Post[];

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];
}
