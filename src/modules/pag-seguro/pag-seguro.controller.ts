import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { PagSeguroService } from "./pag-seguro.service";
import { KeyPublicDTO } from "./dto/key-public.dto";

@Controller('public-key')
export class PagSeguroController {
    constructor( private readonly pagSeguroService: PagSeguroService){}

    @Get()
    async getPulicKey(): Promise<KeyPublicDTO> {
        return this.pagSeguroService.getKeyPublic();
    }

    @Post('webhook-notification')
    async webhookNotification(
        @Body() payload: any,
        @Headers('x-pagbank-signature') signature: string
    ) {
        await this.pagSeguroService.validationSignature(payload, signature)
    }
}