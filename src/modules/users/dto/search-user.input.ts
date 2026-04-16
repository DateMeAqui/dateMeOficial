import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

@InputType()
export class SearchUserInput {

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  // @Field(() => [Gender], { nullable: true })
  // @IsOptional()
  // preferences?: Gender[];

  // @Field(() => DistanceRadius, { nullable: true })
  // @IsOptional()
  // @IsEnum(DistanceRadius)
  // distanceKm?: DistanceRadius;

  // @Field({ nullable: true })
  // @IsOptional()
  // @IsNumber()
  // latitude?: number;

  // @Field({ nullable: true })
  // @IsOptional()
  // @IsNumber()
  // longitude?: number;

  // @Field(() => LastLoginFilter, { nullable: true })
  // @IsOptional()
  // @IsEnum(LastLoginFilter)
  // lastLogin?: LastLoginFilter;

  @Field({ nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @Field({ nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}