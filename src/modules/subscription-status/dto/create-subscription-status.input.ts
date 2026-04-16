import { InputType, Field } from '@nestjs/graphql';
import { IsInt, IsString } from 'class-validator';
import { SubscriptionStatusEnum } from '../enum/subscription-status.enum';

@InputType()
export class CreateSubscriptionStatusInput {
  @Field()
  @IsString()
  slug: string;

  @Field()
  @IsString()
  description: string;
}

@InputType()
export class CreateSubscriptionStatusSlugInput {
  @Field(() => SubscriptionStatusEnum)
  @IsString()
  slug: SubscriptionStatusEnum;
}