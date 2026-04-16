import { InputType, Int, Field } from '@nestjs/graphql';
import { IsInt, IsString } from 'class-validator';
import { PlanSlugEnum } from '../enum/plan-slug.enum';

@InputType()
export class CreatePlanInput {
    @Field()
    @IsString()
    name: string;
  
    @Field()
    @IsString()
    description: string;
  
    @Field(() => Int)
    @IsInt()
    price: number;
  
    @Field()
    @IsString()
    currency: string;
}

@InputType()
export class CreatePlanNameInput {
    @Field(() => PlanSlugEnum)
    @IsString()
    name: PlanSlugEnum;
}