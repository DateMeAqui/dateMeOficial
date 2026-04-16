import { CreateSubscriptionStatusInput } from './create-subscription-status.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateSubscriptionStatusInput extends PartialType(CreateSubscriptionStatusInput) {}