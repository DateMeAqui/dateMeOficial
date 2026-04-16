import { Field, InputType } from "@nestjs/graphql";
import { IsString } from "class-validator";

@InputType()
class AddressInput {
    @Field({description: 'Exemplo: Avenida Brigadeiro Faria Lima'})
    @IsString()
    street: string;

    @Field({description: 'Exemplo: 1384'})
    @IsString()
    number: string;
    
    @Field({description: 'Exemplo: Pinheiros'})
    @IsString()
    locality: string;

    @Field({description: 'Exemplo: São Paulo'})
    @IsString()
    city: string;

    @Field({description: 'Exemplo: SP'})
    @IsString()
    region_code: string;  

    @Field({description: 'Exemplo: shipping "BRA" em holder "Brasil"'})
    @IsString()
    country: string;

    @Field({description: 'Exemplo: 01452002'})
    @IsString()
    postal_code: string;
}

@InputType()
export class AddressShipping extends AddressInput {
    @Field({description: 'Exemplo: apto 12'})
    @IsString()
    complement: string;
}

@InputType()
export class AddressHolder extends AddressInput {
    @Field({description: 'Exemplo: São Paulo'})
    @IsString()
    region: string;
}