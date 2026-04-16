// import axios from 'axios';
// import { ConfigService } from '@nestjs/config';
// import { Injectable } from '@nestjs/common';
// import { KeyPublicDTO } from '../dto/key-public.dto';

// @Injectable()
// export class GeneratedKeyPublic {
//     constructor(
//         private configService: ConfigService
//     ){}

//     async executionKeyPublic(): Promise<KeyPublicDTO>{

//         try{
//             const options = {
//                 method: 'POST',
//                 url: 'https://sandbox.api.pagseguro.com/public-keys',
//                 headers: {
//                     accept: 'application/json',
//                     Authorization: `Bearer ${this.configService.get<string>('TOKEN_PAGSEGURO')}`,
//                     'content-type': 'application/json'
//                 },
//                 data: {type: 'card'}
//             };

//             const result = await axios.request(options)
//             const key = `-----BEGIN PUBLIC KEY-----\n${result.data?.public_key}\n-----END PUBLIC KEY-----`;
//             return {
//                 public_key: key,
//                 created_at: result.data?.created_at

//             }
//         }catch(err) {
//             console.error(`Erro na requisição PagSeguro: ${err.response?.data || err.message}`)
//             throw err;
//         }
//     }

// }