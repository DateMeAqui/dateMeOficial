import { Injectable } from '@nestjs/common';
const Telesign = require('telesignsdk');

@Injectable()
export class SmsService {
  private client: any;

  constructor() {
    const customerId = process.env.TELESIGN_CUSTOMER_ID;
    const apiKey = process.env.TELESIGN_API_KEY;

    if (!customerId || !apiKey) {
      throw new Error('Telesign environment variables are missing');
    }


    this.client = new Telesign(customerId, apiKey);
  }

  async sendSms(smartphoneNumber: string, verificationCode: number) {
    return new Promise((resolve, reject) => {
      const message = `Seu código de verificação é: ${verificationCode}`;
      const messageType = 'ARN';
      const formattedNumber = "+55" + smartphoneNumber;


      this.client.sms.message(
        (error: any, responseBody: any) => {
          if (error) {
            console.error('Erro ao enviar SMS Telesign:', error);
            return reject(error);
          }
          resolve(responseBody);
        },
        formattedNumber,    // Segundo parâmetro: número
        message,            // Terceiro parâmetro: mensagem
        messageType         // Quarto parâmetro: tipo de mensagem
      );
    });
  }
}