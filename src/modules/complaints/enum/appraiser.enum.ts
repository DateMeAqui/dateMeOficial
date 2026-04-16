import { registerEnumType } from "@nestjs/graphql";

export enum AppraiserEnum {
    ASSISTANT = "assistant",
    HUMAN = "human"
}
registerEnumType(AppraiserEnum, {name: 'AppraiserEnum'});