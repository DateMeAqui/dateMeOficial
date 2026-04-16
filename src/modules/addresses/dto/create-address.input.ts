import { InputType, Int, Field } from '@nestjs/graphql';
import { IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field()
  @IsNotEmpty({ message: 'Rua é obrigatória' })
  @IsString()
  street: string;

  @Field()
  @IsNotEmpty({ message: 'Número é obrigatório' })
  @IsNumber()
  number: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  complement?: string;

  @Field()
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  @IsString()
  district: string;

  @Field()
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @IsString()
  city: string;

  @Field()
  @IsNotEmpty({ message: 'Estado é obrigatório' })
  @IsString()
  @Length(2, 2, { message: 'Estado deve ter 2 caracteres' })
  state: string;

  @Field()
  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @IsString()
  @Length(8, 9, { message: 'CEP deve ter 8 ou 9 caracteres' })
  cep: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
