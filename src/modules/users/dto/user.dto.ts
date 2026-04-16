import { ObjectType, Field, ID, GraphQLISODateTime, Int, Float } from '@nestjs/graphql';
import { StatusUser } from '../enums/status_user.enum';
import { AddressDTO } from 'src/modules/addresses/dto/address.dto';
import { Role } from 'src/modules/roles/dto/role.dto';

@ObjectType('UserDTO')
export class User {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String)
  nickName: string;

  @Field(() => String, { nullable: false })
  email: string;

  @Field(() => String)
  password: string;

  @Field(() => String)
  smartphone: string;

  @Field(() => String, { nullable: true })
  resetPasswordToken?: string | null;
  
  @Field(() => Date)
  birthdate: Date;

  @Field(() => String)
  cpf: string;

  @Field(() => GraphQLISODateTime, { nullable: true, name: "deleted_at" })
  deletedAt?: Date | null;

  @Field(() => Date, { name: "created_at" })
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true, name: "update_at" })
  updatedAt?: Date | null;

  @Field(() => String)
  status: string;

  @Field(() => Int)
  verificationCode: number;

  @Field(() => Boolean, { nullable: true }) // CORREÇÃO: Tipo explícito Boolean
  isOnline?: boolean | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastLogin?: Date | null;

  @Field(() => AddressDTO, { nullable: true })
  address?: AddressDTO | null;

  @Field(() => Role)
  role: Role;

  @Field(() => Int)
  roleId: number;

  // @Field(() => [CommentDTO], { nullable: true })
  // comments?: CommentDTO[] | null;

}

@ObjectType()
export class UsersWithPagination {
  @Field(() => [UserWithAge])
  users: UserWithAge[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => [String], {nullable: true})
  preferences?: string[];

  @Field(() => Float, {nullable: true})
  distanceKm?: number;

  @Field(() => Float, {nullable: true})
  latitude?: number;

  @Field(() => Float, {nullable: true})
  longitude?: number;
}

@ObjectType('UserWithAgeDTO')
export class UserWithAge extends User{
  @Field(() => Int)
  age: number;
}