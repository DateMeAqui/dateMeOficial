import { Injectable } from '@nestjs/common';
import { KeyPublicDTO } from './dto/key-public.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import path from 'path';
import { promisify } from 'util';
import { generateKeyPair } from 'crypto';
import { promises as fs } from 'fs';
import { PagSeguroAPI } from './pagseguro-api';
import { CreateAndPaymentOrderWithCardInput } from './dto/create-and-payment-order-with-card.input';
import { CreateOrderQRCodePixInput } from './dto/create-order-QR-code-pix.input';
import { CreateOrderBoletoInput } from './dto/create-order-boleto.input';
import { instanceToPlain } from 'class-transformer';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderBoletoDTO } from './dto/create-order-boleto.dto';
import { CreateOrderInput } from './dto/create-order.input';
var crypto = require('crypto');

const generateKeyPairAsync = promisify(generateKeyPair);

@Injectable()
export class PagSeguroService {
  constructor(
          private configService: ConfigService,
          private pagSeguroAPI: PagSeguroAPI,
          private payment: PaymentsService
      ){
        
      }
  private keysDir = path.resolve('src/keys');
  
  async executionKeyPublic(): Promise<KeyPublicDTO>{
    try{
      const response = await this.pagSeguroAPI.requestPagSeguro({
        typeMethod: 'POST',
        url: '/public-keys',
        headers: {accept: 'application/json'},
        data: {type: 'card'}
      });

      const key = `-----BEGIN PUBLIC KEY-----\n${response.data?.public_key}\n-----END PUBLIC KEY-----`;
      return {
          public_key: key,
          created_at: response.data?.created_at
      }
    }catch(err) {
        console.error(`Erro na requisição PagSeguro: ${err.response?.data || err.message}`)
        throw err;
    }
  }

  //gerando as chaves publicas e privadas
  async generateKeys(): Promise<void> {
    //Gera o par de chaves RSA 2048 bits
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa',{
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        }
    });

    //Garante que a pasta de chaves exista
    await fs.mkdir(this.keysDir, {recursive: true});

    //Salva a chave pública
    await fs.writeFile(path.join(this.keysDir, 'public_key.pem'), publicKey, 'utf8');

    //salva a chave privada
    await fs.writeFile(path.join(this.keysDir, 'private_key.pem'), privateKey, 'utf8');

  }

  //endpoint disponibilizado para o ambiente PagSeguro
  async getKeyPublic(): Promise<KeyPublicDTO>{
    const publicKeyPath = await path.join(this.keysDir, 'public_key.pem');
    const publicKey = await fs.readFile(publicKeyPath, 'utf8');
 
    return {
      public_key: String(publicKey),
      created_at: Date.now(),
    }
  }

  async getAccessToken(){
    const options = {
      method: 'POST',
      url: 'https://sandbox.api.pagseguro.com/oauth2/token',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${this.configService.get<string>('TOKEN_PAGSEGURO')}`,
        'content-type': 'application/json'
      },
      data: {
        grant_type: 'challenge',
        scope: 'certificate.create'
      }
    };

    axios
      .request(options)
      .catch(err => console.error(err));

  }

  //CRIA E PAGA UM PEDIDO
  async createAndPaymentOrder(create: CreateOrderInput){

    let selectCreate = create.boleto || create.cardCredit || create.pix;

    if (!selectCreate) {
      throw new Error('No payment method!');
    }
    
    selectCreate['notification_urls'] = selectCreate['notification_urls'] ?? [];
    selectCreate['notification_urls'][0] = `${this.configService.get<string>('NOTIFICATION_PAYMENTS_URL')}`;

    const formatStringJsonData = JSON.stringify(selectCreate, null, 2)
    
    const response = await this.pagSeguroAPI.requestPagSeguro({
      typeMethod: 'POST',
      url: '/orders',
      data: formatStringJsonData
    })
    // await this.payment.createPaymentDataRaw(response.data)
    return response.data
  }


  //CONSUTAR PEDIDO
  async consultOrder(order_id: string){
    const response = await this.pagSeguroAPI.requestPagSeguro({
      typeMethod: 'GET',
      url: `/orders/${order_id}`
    })

    return response.data
  }

  //PAGAR PEDIDO
  async payOrder(order_id: string){
    const response = await this.pagSeguroAPI.requestPagSeguro({
      typeMethod: 'POST',
      url: `/orders/${order_id}/pay`
    })

    return response.data
  }

  //PAGAR PEDIDO
  async naoSeiOrder(charges_id: string){
    const response = await this.pagSeguroAPI.requestPagSeguro({
      typeMethod: 'GET',
      url: `/charges/${charges_id}`
    })

    return response.data
  }

  async validationSignature(payload: any, signature: string){
    const payloadString = JSON.stringify(payload);

    const expectedSignature = await crypto
      .createHash('sha256')
      .update(this.configService.get<string>('PAGBANK_WEBHOOK_SECRET')+"-"+payload)
      .digest('hex');
    

  }
}
