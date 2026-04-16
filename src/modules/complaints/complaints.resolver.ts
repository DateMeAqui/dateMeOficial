import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ComplaintsService } from './complaints.service';
import { Complaint } from './entities/complaint.entity';
import { CreateComplaintInput } from './dto/create-complaint.input';
import { UpdateComplaintInput } from './dto/update-complaint.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Complaint)
export class ComplaintsResolver {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'USER')
  @Mutation(() => String, { name: 'createComplaint' })
  async createComplaint(
    @Args('createComplaintInput') createComplaintInput: CreateComplaintInput,
    @Args('userId', {nullable: true}) userId: string,
    @CurrentUser() me
  ) {
      const id = userId || me.id
      return await this.complaintsService.createComplaint(createComplaintInput, id);
    }
}
