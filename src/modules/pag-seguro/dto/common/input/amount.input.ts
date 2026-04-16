import { Field, InputType, Int } from "@nestjs/graphql";

@InputType()
export class AmountInput {
  @Field(() => Int)
  value: number;

  
}

@InputType()
export class AmountWithCurrencyInput extends AmountInput {
  @Field()
  currency: string;
}