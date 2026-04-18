import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '../enums/gender.enum';

@InputType()
export class CreateProfileInput {
  @Field(() => Gender)
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  @IsEnum(Gender, { message: 'Gênero inválido' })
  gender: Gender;

  @Field(() => [Gender])
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione ao menos uma preferência' })
  @IsEnum(Gender, { each: true, message: 'Preferência inválida' })
  preferences: Gender[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio deve ter no máximo 500 caracteres' })
  bio?: string;
}
