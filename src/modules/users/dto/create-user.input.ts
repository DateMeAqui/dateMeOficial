import { InputType, Field } from '@nestjs/graphql';
import { StatusUser } from '../enums/status_user.enum';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { IsValidCPF } from '../../common/validators/cpf.validator'
import { Type } from 'class-transformer';
import { UpdateAddressInput } from 'src/modules/addresses/dto/update-address.input';
import { RoleEnum } from '../enums/role.enum';

@InputType()
export class CreateUserInput {
  
 @Field()
  @IsNotEmpty({ message: 'Nome completo é obrigatório' })
  @IsString()
  fullName: string;

  @Field()
  @IsNotEmpty({ message: 'Apelido é obrigatório' })
  @IsString()
  nickName: string;

  @Field({ nullable: false })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email deve ser válido' })
  email: string;

  @Field()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @Field()
  @IsNotEmpty({ message: 'Celular é obrigatório' })
  @IsString()
  smartphone: string;

  @Field()
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  birthdate: Date;

  @Field()
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString()
  @IsValidCPF({ message: 'CPF inválido' })
  cpf: string;

  @Field(() => StatusUser, { defaultValue: StatusUser.PENDING })
  @IsOptional() // Este campo é opcional devido ao defaultValue
  status: StatusUser;

  @Field(() => UpdateAddressInput, {nullable: true})
  @ValidateNested()
  @Type(() => UpdateAddressInput)
  address?: UpdateAddressInput;

  @Field(() => RoleEnum)
  @IsNotEmpty({ message: 'Role é obrigatória' })
  @IsEnum(RoleEnum, { message: 'Role deve ser SUPER_ADMIN, ADMIN ou USER' })
  roleId: RoleEnum
}
