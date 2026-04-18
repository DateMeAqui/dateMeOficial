# src/llm-service

> **Exceção ao template de 11 seções.** Esta pasta **não é** um NestModule; é um microsserviço Python FastAPI separado, empacotado em container Docker independente. O README usa template simplificado por esse motivo.

## Propósito

Microsserviço HTTP em Python com FastAPI, pensado para funcionar como wrapper/host de chamadas a LLMs (Ollama local, LangChain, etc.), isolado do monólito NestJS.

**Estado atual:** o código contém apenas um healthcheck. Não há endpoint de análise de conteúdo implementado, não importa `langchain` em runtime e não integra com o módulo NestJS `assistant_ai`. É um esqueleto que está no repositório, mas não participa do fluxo de produção atual.

## Estrutura

```
src/llm-service/
├── Dockerfile           # python:3.11-slim + uvicorn/FastAPI
├── requirements.txt     # fastapi, uvicorn, langchain, requests
└── app.py               # FastAPI app com uma rota GET /health
```

## API HTTP

| Método | Rota | Resposta | Uso |
| --- | --- | --- | --- |
| GET | `/health` | `{"status": "ok"}` | Healthcheck |

Nenhum outro endpoint está implementado. O arquivo [`./app.py`](./app.py) tem 8 linhas.

## Execução

### Localmente

```bash
cd src/llm-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Via container

```bash
cd src/llm-service
docker build -t date-me-llm-service .
docker run -p 8000:8000 date-me-llm-service
```

Porta exposta: **8000**. Entrypoint do Dockerfile: `uvicorn app:app --host 0.0.0.0 --port 8000`.

## Dependências Python

Arquivo: [`./requirements.txt`](./requirements.txt).

| Pacote | Uso atual | Observação |
| --- | --- | --- |
| `fastapi` | framework HTTP | usado em `app.py` |
| `uvicorn` | servidor ASGI | usado no `CMD` do Dockerfile |
| `langchain` | declarado | **não importado** em `app.py` |
| `requests` | declarado | **não importado** em `app.py` |

Nenhuma versão fixada — o build Docker baixa a última disponível no momento do `pip install`.

## Variáveis de ambiente

Nenhuma variável lida pelo código atual. O plano original (ver [`../../docs/infrastructure.md`](../../docs/infrastructure.md)) previa variáveis `OLLAMA_*` para endereçamento do LLM local, mas elas **não aparecem** neste microsserviço hoje.

## Quem usa / como integra com o resto do projeto

Nenhum outro módulo do projeto faz chamadas HTTP a este microsserviço (grep reverso por `llm-service` retorna apenas referências em docs/plans). A integração de IA ativa no projeto acontece em dois lugares, nenhum dos quais depende deste serviço:

1. **`src/modules/assistant_ai/`** — consome a Anthropic Claude API diretamente do código NestJS.
2. **`src/modules/n8n-agent/`** — workflow n8n externo que usa Ollama/GLM.

Este microsserviço parece ser um **placeholder** para a futura hospedagem de um agente LangChain próprio (equivalente Python do `assistant_ai`), ainda não desenvolvido.

## Pontos de atenção

- **Sem endpoint útil além do healthcheck.** O serviço não entrega valor operacional no estado atual.
- **`langchain` e `requests` declarados mas não usados.** Remover até o código de fato precisar.
- **Sem fixação de versão** em `requirements.txt` — builds não reproduzíveis. Recomendar `pip-compile`/`uv pip compile` para gerar lockfile.
- **Sem testes.** Nenhum arquivo `test_*.py` presente.
- **Sem CORS configurado.** Se/quando o serviço expuser endpoints consumidos por browser, precisará de `fastapi.middleware.cors.CORSMiddleware`.
- **Sem autenticação.** O healthcheck é público — aceitável. Endpoints futuros devem exigir auth.
- **Dockerfile não usa usuário non-root.** Rodar como usuário dedicado em produção.
- **Integração com o NestJS inexistente.** Definir contrato (endpoints, payloads) antes de desenvolver funcionalidade aqui.
- **Duplicação potencial** com `assistant_ai` (TS) e `n8n-agent`. Antes de evoluir, decidir qual será o caminho canônico de IA.
