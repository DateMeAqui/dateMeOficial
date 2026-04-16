import { Field, InputType, Int } from "@nestjs/graphql";
import { IsOptional, IsPositive } from "class-validator";


@InputType('PaginationInput')
export class PaginationInput{
    @Field(() => Int, {defaultValue:1, nullable: true})
    @IsOptional()
    @IsPositive()
    page?: number;

    @Field(() => Int, {defaultValue:10, nullable: true})
    @IsOptional()
    @IsPositive()
    limit?: number;
}