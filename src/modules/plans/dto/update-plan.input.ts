import { CreatePlanInput } from './create-plan.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdatePlanInput extends PartialType(CreatePlanInput) {
}
