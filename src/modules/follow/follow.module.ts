import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileModule } from '../profile/profile.module';
import { FollowResolver } from './follow.resolver';
import { FollowService } from './follow.service';

@Module({
  imports: [PrismaModule, ProfileModule],
  providers: [FollowService, FollowResolver],
})
export class FollowModule {}
