import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User as UserDTO } from '../users/dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { UpdateProfileInput } from './dto/update-profile.input';
import { ProfileDTO } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@Resolver(() => UserDTO)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @ResolveField('profile', () => ProfileDTO, { nullable: true })
  getProfile(@Parent() user: UserDTO) {
    return this.profileService.findByUserId(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfileDTO, { name: 'myProfile', nullable: true })
  myProfile(@CurrentUser() me: { id: string }) {
    return this.profileService.findByUserId(me.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfileDTO, { name: 'getProfileByUserId', nullable: true })
  getProfileByUserId(@Args('userId') userId: string) {
    return this.profileService.findByUserId(userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProfileDTO, { name: 'updateMyProfile' })
  updateMyProfile(
    @Args('input') input: UpdateProfileInput,
    @CurrentUser() me: { id: string },
  ) {
    return this.profileService.updateByUserId(me.id, input);
  }
}
