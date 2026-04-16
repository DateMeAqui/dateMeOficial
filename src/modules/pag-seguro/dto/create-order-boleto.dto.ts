import { Field, Int, ObjectType } from "@nestjs/graphql";
import { IsObject, IsString, } from "class-validator";
import { CustomerDTO } from "./common/dto/customer.dto";
import { ItemsDTO } from "./common/dto/items.dto";
import { ShippingDTO } from "./common/dto/shipping.dto";
import { LinksDTO } from "./common/dto/links.dto";
import { AddressPagSeguroDTO } from "./common/dto/address.dto";

@ObjectType()
class InstructionLinesDTO {
    @Field()
    line_1: string;

    @Field()
    line_2: string;

}

@ObjectType()
class HolderBoletoDTO {
    @Field({description:"Nome do proprietario do cartão"})
    @IsString()
    name: string;

    @Field({description: "cpf do proprietario"})
    @IsString()
    tax_id: string;

    @Field({description: "email do proprietario"})
    @IsString()
    email: string;

    @Field(() => AddressPagSeguroDTO)
    @IsObject()
    address: AddressPagSeguroDTO;
}

@ObjectType()
class BoletoDTO {
    @Field()
    id: string;

    @Field()
    barcode: string;

    @Field()
    formatted_barcode: string;

    @Field()
    due_date: string;

    @Field(() => InstructionLinesDTO)
    instruction_lines: InstructionLinesDTO;

    @Field(() => HolderBoletoDTO)
    holder: HolderBoletoDTO;
}

// ---------------- RESUMO DO VALOR ----------------
@ObjectType()
class AmountSummaryBoletoDTO {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  paid: number;

  @Field(() => Int)
  refunded: number;
}

// ---------------- VALOR ----------------
@ObjectType()
class AmountBoletoDTO {
  @Field(() => Int)
  value: number;

  @Field()
  currency: string;

  @Field(() => AmountSummaryBoletoDTO)
  summary: AmountSummaryBoletoDTO;
}

// ---------------- MÉTODO DE PAGAMENTO ----------------
@ObjectType()
class PaymentMethodDTO {
  @Field()
  type: string;

  @Field(() => BoletoDTO)
  boleto: BoletoDTO;
}

@ObjectType()
class PaymentResponseDTO{
    @Field()
    code: string;

    @Field()
    message: string;
}

// ---------------- COBRANÇA ----------------
@ObjectType()
class ChargeBoletoDTO {
  @Field()
  id: string;

  @Field()
  reference_id: string;

  @Field()
  status: string;

  @Field()
  created_at: string;

  @Field()
  description: string;

  @Field(() => AmountBoletoDTO)
  amount: AmountBoletoDTO;

  @Field(() => [PaymentResponseDTO])
  payment_response: PaymentResponseDTO[];

  @Field(() => PaymentMethodDTO)
  payment_method: PaymentMethodDTO;

  @Field(() => [LinksDTO])
   links: LinksDTO[];
}


@ObjectType()
export class CreateOrderBoletoDTO {
    @Field()
    id: string;

    @Field()
    reference_id: string;

    @Field()
    created_at: string;

    @Field(() => CustomerDTO)
    customer: CustomerDTO;

    @Field(() => [ItemsDTO])
    items: ItemsDTO[];

    @Field(() => ShippingDTO)
    shipping: ShippingDTO;

    @Field(() => [ChargeBoletoDTO])
    charges: ChargeBoletoDTO[];

    @Field(() => [String])
    notification_urls: string[];

    @Field(() => [LinksDTO])
    links: LinksDTO[];
}