import { Field, ObjectType, Int, Float } from "@nestjs/graphql";
import { CustomerDTO } from "./common/dto/customer.dto";
import { ItemsDTO } from "./common/dto/items.dto";
import { LinksDTO } from "./common/dto/links.dto";

// ---------------- RESUMO DO VALOR ----------------
@ObjectType()
class AmountSummaryDTO {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  paid: number;

  @Field(() => Int)
  refunded: number;
}

// ---------------- VALOR ----------------
@ObjectType()
class AmountDTO {
  @Field(() => Int)
  value: number;

  @Field()
  currency: string;

  @Field(() => AmountSummaryDTO)
  summary: AmountSummaryDTO;
}

// ---------------- HOLDER DO CARTÃO ----------------
@ObjectType()
class HolderDTO {
  @Field()
  name: string;
}

// ---------------- CARTÃO ----------------
@ObjectType()
class CardDTO {
  @Field()
  brand: string;

  @Field()
  first_digits: string;

  @Field()
  last_digits: string;

  @Field()
  exp_month: string;

  @Field()
  exp_year: string;

  @Field(() => HolderDTO)
  holder: HolderDTO;

  @Field()
  store: boolean;
}

// ---------------- MÉTODO DE PAGAMENTO ----------------
@ObjectType()
class PaymentMethodDTO {
  @Field()
  type: string;

  @Field(() => Int)
  installments: number;

  @Field()
  capture: boolean;

  @Field(() => CardDTO)
  card: CardDTO;

  @Field()
  soft_descriptor: string;
}

@ObjectType()
class RawDataDTO {
  @Field()
  authorization_code: string;

  @Field()
  nsu: string;

  @Field()
  reason_code: string;
}

// ---------------- RESPOSTA DE PAGAMENTO ----------------
@ObjectType()
class PaymentResponseDTO {
  @Field()
  code: string;

  @Field()
  message: string;

  @Field()
  reference: string;

  @Field(() => RawDataDTO)
  raw_data: RawDataDTO;
}



// ---------------- COBRANÇA ----------------
@ObjectType()
class ChargeDTO {
  @Field()
  id: string;

  @Field()
  reference_id: string;

  @Field()
  status: string;

  @Field()
  created_at: string;

  @Field()
  paid_at: string;

  @Field()
  description: string;

  @Field(() => AmountDTO)
  amount: AmountDTO;

  @Field(() => PaymentResponseDTO)
  payment_response: PaymentResponseDTO;

  @Field(() => PaymentMethodDTO)
  payment_method: PaymentMethodDTO;

  @Field(() => [LinksDTO])
  links: LinksDTO[];
}

@ObjectType()
class ItemsCredit extends ItemsDTO {
  @Field()
  reference_id: string;
}
// ---------------- DTO FINAL DE PEDIDO ----------------
@ObjectType()
export class OrderWithCardDTO {
  @Field()
  id: string;

  @Field()
  reference_id: string;

  @Field()
  created_at: string;

  @Field(() => CustomerDTO)
  customer: CustomerDTO;

  @Field(() => [ItemsCredit])
  items: ItemsCredit[];

  @Field(() => [ChargeDTO])
  charges: ChargeDTO[];

  @Field(() => [String])
  notification_urls: string[];

  @Field(() => [LinksDTO])
  links: LinksDTO[];
}
