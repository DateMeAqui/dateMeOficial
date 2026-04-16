import { CreateReportingInput } from './create-reporting.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateReportingInput extends PartialType(CreateReportingInput) {
  @Field(() => Int)
  id: number;
}
