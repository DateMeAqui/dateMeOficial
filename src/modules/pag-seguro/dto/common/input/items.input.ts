import { Field, InputType } from "@nestjs/graphql";
import { IsInt, IsString } from "class-validator";

@InputType()
export class ItemsInput {
    @Field()
    @IsString()
    name: string;

    @Field()
    @IsInt()
    quantity: number;

    @Field()
    @IsInt()
    unit_amount: number;
}

@InputType()
export class ItemsWithReferenceId extends ItemsInput {
    @Field()
    @IsString()
    reference_id: string;
}