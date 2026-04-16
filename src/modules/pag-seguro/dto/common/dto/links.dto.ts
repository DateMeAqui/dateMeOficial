import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LinksDTO {
  @Field()
  rel: string;

  @Field()
  href: string;

  @Field()
  media: string;

  @Field()
  type: string;
}