import { registerEnumType } from "@nestjs/graphql";

export enum IntervalEnum {
    MONTH='MONTH',
    YEAR='YEAR'
}
registerEnumType(IntervalEnum, {name: 'IntervalEnum'});