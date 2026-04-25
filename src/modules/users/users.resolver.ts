import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersWithPagination, UserWithAge } from './dto/user.dto';
import { PaginationInput } from '../common/pagination.input';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/guards/public.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  @Mutation(() => User, { description: 'Cria um user' })
  CreateUser(@Args('createUserInput') createUserInput: CreateUserInput){
    return this.usersService.create(createUserInput);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Query(() => [UserWithAge], { name: 'getUsers' })
  findAll() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'USER')
  @Query(() => UsersWithPagination, {
    description: 'Retorna uma lista paginada de usuários com opção de filtro por termo de busca.',
    name: 'getUsersByPaginationForSearchFullNameOrNickName',
  })
  findAllWithPagination(
    @Args('pagination', {nullable:true}) pagination?: PaginationInput,
    @Args('search', {nullable:true}) search?: string,
  ){
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    return this.usersService.findAllUsersPagination(page, limit, search)
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'USER')
  @Query(() => UserWithAge, {name: 'getUserById'})
  findUserById(@Args('userId') userId: string) {
    return this.usersService.findUserById(userId)
  }
  
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'USER')
  @Mutation(() => User, {name: 'updateUser'})
  updateUser(
    @Args('userId', {nullable: true}) userId: string,
    @Args('updateDataUser') updateDataUser: UpdateUserInput,
    @CurrentUser() me
  ){
    const id = userId || me.id;
    return this.usersService.updateUser(id, updateDataUser, me);
  }

  @Public()
  @Mutation(() => UserWithAge, { name: 'verificationCode' })
  verificationCode(
    @Args('code') code: number,
    @Args('userId') userId: string,
  ){
    return this.usersService.activeStatusWithVerificationCode(userId, code)
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Mutation(() => User , {name: 'deletedUser'})
  deletedUser(@Args('userId') userId: string){
    return this.usersService.deleteUser(userId)
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'USER')
  @Mutation(() => User , {name: 'softDeleted'})
  softDeletedUser(
    @Args('userId') userId: string,
    @CurrentUser() me
  ){
    const id = userId || me.id;
    return this.usersService.softDelete(id, me)
  }

}
