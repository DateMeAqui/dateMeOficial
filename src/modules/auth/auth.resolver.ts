import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UseGuards } from '@nestjs/common';
import { User } from '../users/dto/user.dto';
import { Public } from './guards/public.decorator';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginInput } from './dto/login.input';
import { GqlAuthGuard } from './guards/qgl-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResponse)
  async login(
    @Args('loginInput') loginInput: LoginInput,
    @Context() Context,
  ): Promise<AuthResponse>{
    return await this.authService.login(loginInput)
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async logoutUser(
    @CurrentUser() currentUser,
    @Context() context,
  ): Promise<Boolean> {
    const authHeader: string = context.req?.headers?.authorization ?? '';
    const accessToken = authHeader.replace('Bearer ', '');
    return await this.authService.logout(currentUser.id, accessToken);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => User)
  me(@CurrentUser() user: User){
    return user;
  }
}
