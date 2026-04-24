import { InputType, Int, Field } from '@nestjs/graphql';
import { IntervalEnum } from '../enum/interval.enum';
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateSubscriptionInput {

    @Field(() => Date, {nullable: true})
    @IsOptional()
    @IsDate()
    startDate?: Date;

    @Field(() => Date, {nullable: true})
    @IsOptional()
    @IsDate()
    endDate?: Date;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    userId?: string;
  
    @Field(() => String)
    @IsString()
    planId: string;
  
    @Field(() => Int)
    @IsInt()
    statusId: number;
  
    @Field(() => Boolean, {nullable: true})
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  
    @Field(() => Boolean)
    @IsBoolean()
    autoRenew: boolean;

    @Field(() => Int, {nullable: true})
    @IsOptional()
    @IsInt()
    discount?: number;
  
    @Field(() => IntervalEnum)
    @IsEnum(IntervalEnum)
    interval: IntervalEnum;
  
    @Field(() => Int, {nullable: true})
    @IsOptional()
    @IsInt()
    amount?: number;

    @Field(() => Date, { nullable: true})
    @IsOptional()
    @IsDate()
    trialEnd?: Date;
}
