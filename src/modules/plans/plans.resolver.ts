import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';
import { CreatePlanInput, CreatePlanNameInput } from './dto/create-plan.input';
import { UpdatePlanInput } from './dto/update-plan.input';
import { PlanDTO } from './dto/plan.dto';
import { PlanSlugEnum } from '../subscriptions/enum/plan-slug.enum';

@Resolver(() => Plan)
export class PlansResolver {
  constructor(private readonly plansService: PlansService) {}

  @Mutation(() => PlanDTO)
  createPlan(
    @Args('createPlanInput') createPlanInput: CreatePlanInput
  ) {
    return this.plansService.createPlan(createPlanInput);
  }

  @Query(() => [PlanDTO], { name: 'plans' })
  findAllPlan() {
    return this.plansService.findAllPlan();
  }

  @Query(() => PlanDTO)
  findByName(@Args('namePlan') namePlan: CreatePlanNameInput) {
    return this.plansService.findByName(namePlan);
  }

  @Mutation(() => PlanDTO)
  updatePlan(
    @Args('id') id: string,
    @Args('updatePlanInput') updatePlanInput: UpdatePlanInput
  ) {
    return this.plansService.updatePlan(id, updatePlanInput);
  }

  @Mutation(() => Plan)
  removePlan(@Args('id', { type: () => String }) id: string) {
    return this.plansService.removePlan(id);
  }
}
