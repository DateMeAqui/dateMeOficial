import { Field, ObjectType, Int } from "@nestjs/graphql";
import { CustomerDTO } from "./common/dto/customer.dto";
import { ItemsDTO } from "./common/dto/items.dto";
import { ShippingDTO } from "./common/dto/shipping.dto";
import { LinksDTO } from "./common/dto/links.dto";

@ObjectType()
class AmountPixDTO {
  @Field(() => Int)
  value: number;
}

@ObjectType()
class QRCodesDTO {
  @Field()
  id: string;

  @Field(() => String)
  expiration_date: string;

  @Field(() => AmountPixDTO)
  amount: AmountPixDTO;

  @Field()
  text: string;

  @Field(() => [String])
  arrangements: string[];

  @Field(() => [LinksDTO])
  links: LinksDTO[];
}

@ObjectType()
export class CreateOrderQRCodePixDTO {
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

  @Field(() => [QRCodesDTO])
  qr_codes: QRCodesDTO[];

  @Field(() => [String])
  notification_urls: string[];

  @Field(() => [LinksDTO])
  links: LinksDTO[];
}
