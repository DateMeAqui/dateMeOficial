import axios from 'axios';

export interface PagSeguroRequest {
    typeMethod: 'POST' | 'GET' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    data?: any;
}

export class PagSeguroAPI {
    constructor(
        private token: string,
        private urlBase: string
    ){}

    async requestPagSeguro(pagSeguroRequest: PagSeguroRequest){
        try{
            const options = {
                method: pagSeguroRequest.typeMethod,
                url: `${this.urlBase}${pagSeguroRequest.url}`,
                headers: { 
                    Authorization: `Bearer ${this.token}`,
                    'content-type': 'application/json',
                    ...(pagSeguroRequest.headers || {})
                },
                data: pagSeguroRequest.data ?? undefined
            };

            const response = await axios.request(options);
            return response;
        } catch (err) {
            if (err.response) {
                console.error('Status:', err.response.status);
                console.error('Resposta PagSeguro:', JSON.stringify(err.response.data, null, 2));
            } else {
                console.error('Erro na requisição PagSeguro:', err.message);
            }
            throw err;
        }
    }
}