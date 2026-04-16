import { registerEnumType } from "@nestjs/graphql";

export enum PlanSlugEnum {
    FREE='FREE',
    PRO='PRO',
    ULTIMATE='ULTIMATE'
}
registerEnumType(PlanSlugEnum, {name: 'PlanSlugEnum'});