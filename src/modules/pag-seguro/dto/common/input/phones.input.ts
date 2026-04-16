import { Field, InputType } from "@nestjs/graphql";
import { MaxLength, MinLength } from "class-validator";
import { TypePhoneEnum } from "src/modules/pag-seguro/enum/type-phone.enum";

@InputType()
export class PhoneInput {
    @Field({description: 'Código de operadora do País (DDI)'})
    country: string;

    @Field({description: 'Código de operadora local (DDD)'})
    area: string;

    @Field()
    @MaxLength(9)
    @MinLength(8)
    number: string;

    @Field(() => TypePhoneEnum)
    type: TypePhoneEnum;
}