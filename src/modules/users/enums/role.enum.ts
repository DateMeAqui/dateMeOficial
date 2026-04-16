import { registerEnumType } from "@nestjs/graphql";

export enum RoleEnum {
    SUPER_ADMIN = 1,
    ADMIN = 2,
    USER = 3,

}
registerEnumType(RoleEnum, {name: 'RoleEnum'});