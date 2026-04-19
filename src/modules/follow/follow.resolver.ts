import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { ProfileDTO } from '../profile/dto/profile.dto';
import { ProfileService } from '../profile/profile.service';
import { FollowDTO } from './dto/follow.dto';
import { ProfilesWithPagination } from './dto/profiles-with-pagination.dto';
import { FollowService } from './follow.service';

@Resolver(() => ProfileDTO)
export class FollowResolver {
  constructor(
    private readonly followService: FollowService,
    private readonly profileService: ProfileService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => FollowDTO, { name: 'followProfile' })
  followProfile(
    @Args('profileId', { type: () => ID }) profileId: string,
    @CurrentUser() me: { id: string },
  ) {
    return this.followService.follow(me.id, profileId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { name: 'unfollowProfile' })
  unfollowProfile(
    @Args('profileId', { type: () => ID }) profileId: string,
    @CurrentUser() me: { id: string },
  ) {
    return this.followService.unfollow(me.id, profileId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfilesWithPagination, { name: 'myFollowers' })
  async myFollowers(
    @CurrentUser() me: { id: string },
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const profile = await this.profileService.findByUserId(me.id);
    return this.followService.getFollowers(profile!.id, page ?? 1, limit ?? 10);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfilesWithPagination, { name: 'myFollowing' })
  async myFollowing(
    @CurrentUser() me: { id: string },
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const profile = await this.profileService.findByUserId(me.id);
    return this.followService.getFollowing(profile!.id, page ?? 1, limit ?? 10);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Boolean, { name: 'isFollowing' })
  isFollowing(
    @Args('profileId', { type: () => ID }) profileId: string,
    @CurrentUser() me: { id: string },
  ) {
    return this.followService.isFollowing(me.id, profileId);
  }

  @ResolveField('followersCount', () => Int)
  followersCount(@Parent() profile: ProfileDTO) {
    return this.followService.getFollowersCount(profile.id);
  }

  @ResolveField('followingCount', () => Int)
  followingCount(@Parent() profile: ProfileDTO) {
    return this.followService.getFollowingCount(profile.id);
  }
}
