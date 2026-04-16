import { registerEnumType } from "@nestjs/graphql";

export enum SubscriptionStatusEnum {
    ACTIVE='active',
    PASTDUE='pastDue',
    CANCELED='canceled',
    INCOMPLETE='incomplete',
    INCOMPLETE_EXPIRED='incompleteExpired',
    TRIALING='trialing'
}
registerEnumType(SubscriptionStatusEnum, {name: 'SubscriptionStatusEnum'});