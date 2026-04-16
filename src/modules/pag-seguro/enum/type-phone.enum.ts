import { registerEnumType } from "@nestjs/graphql";

export enum TypePhoneEnum {
    MOBILE='MOBILE',
    BUSINESS='BUSINESS',
    HOME='HOME'
}
registerEnumType(TypePhoneEnum, {name: 'TypePhoneEnum'});