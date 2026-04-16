import { registerEnumType } from "@nestjs/graphql";

export enum StatusUser {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DELETED = 'DELETED',
    BLOCKED = 'BLOCKED',
    PENDING = 'PENDING',
}
registerEnumType(StatusUser, {name: 'StatusUser'});