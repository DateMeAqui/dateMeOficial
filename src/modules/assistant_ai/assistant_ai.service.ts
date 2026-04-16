import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

// Interface para o resultado da análise
interface ResultadoAnalise {
  categoria: 
    | 'discurso_de_odio' 
    | 'ameaca' 
    | 'assedio' 
    | 'desinformacao_grave' 
    | 'golpe_financeiro' 
    | 'conteudo_sexual_explicito' 
    | 'spam' 
    | 'falso_positivo';
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
  confianca: number; // 0-100
  justificativa: string;
  acao_recomendada: 'ignorar' | 'avisar' | 'remover' | 'banir' | 'investigar';
}

@Injectable()
export class AssistantAiService {
  // private client: Anthropic;
  
  constructor(
    private client: Anthropic,
  ) {
    // Inicializa o cliente Anthropic
    // this.client = new Anthropic({
    //   apiKey: process.env.ANTHROPIC_API_KEY, // Configure no .env
    // });
    
  }

  /**
   * Analisa uma denúncia usando Claude Sonnet 4.5
   */
  async analisarDenuncia(
    postContent: string, 
    denunciaMotivo: string,
    contexto?: string // Opcional: conversa anterior, perfil do autor, etc.
  ): Promise<ResultadoAnalise> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: this.construirPrompt(postContent, denunciaMotivo, contexto)
        }]
      });

      // Extrai o texto da resposta
      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Parse do JSON retornado pelo Claude
      return this.parseResposta(responseText);

    } catch (error) {
      console.error('Erro ao analisar denúncia:', error);
      throw new Error(`Falha na análise: ${error.message}`);
    }
  }

  /**
   * Constrói o prompt estruturado para o Claude
   */
  private construirPrompt(
    postContent: string, 
    denunciaMotivo: string,
    contexto?: string
  ): string {
    return `Você é um moderador de conteúdo especializado. Analise a denúncia abaixo seguindo as diretrizes da plataforma.

DIRETRIZES DA PLATAFORMA:
- Permitimos críticas políticas e debates acalorados, MAS não incitação à violência
- Palavrões isolados são aceitáveis, assédio direcionado NÃO é tolerado
- Discussões sobre temas sensíveis são permitidas se respeitosas
- Contexto cultural brasileiro deve ser considerado (regionalismos, gírias)
- Sarcasmo e ironia devem ser diferenciados de ameaças reais

CATEGORIAS POSSÍVEIS:
- discurso_de_odio: Racismo, homofobia, xenofobia, transfobia, capacitismo
- ameaca: Violência física explícita, ameaças de morte
- assedio: Sexual, bullying persistente, stalking
- desinformacao_grave: Saúde pública, processos eleitorais, emergências
- golpe_financeiro: Esquemas pirâmides, phishing, fraudes
- conteudo_sexual_explicito: Pornografia, solicitação de nudes
- spam: Propaganda repetitiva, links suspeitos em massa
- falso_positivo: Denúncia improcedente ou mal-intencionada

POST DENUNCIADO:
"""
${postContent}
"""

MOTIVO DA DENÚNCIA:
"""
${denunciaMotivo}
"""

${contexto ? `CONTEXTO ADICIONAL:\n${contexto}\n` : ''}

INSTRUÇÕES:
Analise cuidadosamente considerando:
1. O conteúdo literal do post
2. O contexto e intenção provável
3. Nuances culturais e linguísticas brasileiras
4. Severidade do possível dano
5. Se a denúncia é procedente

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem explicações extras):
{
  "categoria": "uma_das_categorias_acima",
  "severidade": "baixa|media|alta|critica",
  "confianca": 0-100,
  "justificativa": "explicação clara e objetiva da decisão",
  "acao_recomendada": "ignorar|avisar|remover|banir|investigar"
}`;
  }

  /**
   * Faz parse seguro da resposta do Claude
   */
  private parseResposta(responseText: string): ResultadoAnalise {
    try {
      // Remove possíveis markdown code blocks
      const jsonText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(jsonText);

      // Validação básica
      if (!parsed.categoria || !parsed.severidade || !parsed.acao_recomendada) {
        throw new Error('Resposta do Claude incompleta');
      }

      // Garante que confianca está entre 0-100
      parsed.confianca = Math.max(0, Math.min(100, parsed.confianca || 0));

      return parsed as ResultadoAnalise;

    } catch (error) {
      console.error('Erro ao parsear resposta:', error);
      console.error('Resposta original:', responseText);
      
      // Fallback: retorna resultado conservador
      return {
        categoria: 'falso_positivo',
        severidade: 'baixa',
        confianca: 0,
        justificativa: 'Erro ao processar análise. Requer revisão manual.',
        acao_recomendada: 'investigar'
      };
    }
  }

  /**
   * Análise em lote (para múltiplas denúncias)
   */
  async analisarLote(denuncias: Array<{
    postContent: string;
    denunciaMotivo: string;
    contexto?: string;
  }>): Promise<ResultadoAnalise[]> {
    // Processa em paralelo (máximo 5 simultâneos para não estourar rate limit)
    const BATCH_SIZE = 5;
    const resultados: ResultadoAnalise[] = [];

    for (let i = 0; i < denuncias.length; i += BATCH_SIZE) {
      const batch = denuncias.slice(i, i + BATCH_SIZE);
      const batchResultados = await Promise.all(
        batch.map(d => this.analisarDenuncia(d.postContent, d.denunciaMotivo, d.contexto))
      );
      resultados.push(...batchResultados);
    }

    return resultados;
  }

  /**
   * Versão com cache de prompt (economiza tokens em análises repetitivas)
   * Útil se você tem MUITAS denúncias com as mesmas diretrizes
   */
  async analisarDenunciaComCache(
    postContent: string, 
    denunciaMotivo: string,
    contexto?: string
  ): Promise<ResultadoAnalise> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: `Você é um moderador de conteúdo especializado. Analise denúncias seguindo as diretrizes da plataforma.

DIRETRIZES DA PLATAFORMA:
- Permitimos críticas políticas e debates acalorados, MAS não incitação à violência
- Palavrões isolados são aceitáveis, assédio direcionado NÃO é tolerado
- Discussões sobre temas sensíveis são permitidas se respeitosas
- Contexto cultural brasileiro deve ser considerado`,
            cache_control: { type: 'ephemeral' } // Cache este bloco
          }
        ],
        messages: [{
          role: 'user',
          content: `POST DENUNCIADO:\n${postContent}\n\nMOTIVO:\n${denunciaMotivo}\n\nResponda em JSON com: categoria, severidade, confianca, justificativa, acao_recomendada`
        }]
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return this.parseResposta(responseText);

    } catch (error) {
      console.error('Erro ao analisar denúncia com cache:', error);
      throw new Error(`Falha na análise: ${error.message}`);
    }
  }
}