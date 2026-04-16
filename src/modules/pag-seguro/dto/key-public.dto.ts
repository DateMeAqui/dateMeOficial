import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class KeyPublicDTO {

    @Field()
    public_key: string;

    @Field()
    created_at: number;
}