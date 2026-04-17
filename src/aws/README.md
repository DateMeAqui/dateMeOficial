# src/aws

> **Exceção ao template de 11 seções.** Esta pasta **não é** um NestModule; é um projeto AWS SAM (Serverless Application Model) independente, empacotado separadamente do monólito NestJS. O README usa template simplificado por esse motivo.

## Propósito

Pipeline serverless em AWS responsável por processar notificações de pagamento vindas do PagSeguro. Recebe callbacks via API Gateway, enfileira em SQS FIFO e, por meio de uma segunda Lambda, consulta o banco Postgres (via SSM Parameter Store / Secrets Manager para credenciais) e persiste o `Payment` correspondente na tabela `payments`.

Importante: esta pipeline **grava diretamente na mesma tabela `payments` do banco da aplicação NestJS** usando `pg` nativo — ignorando o Prisma do monólito. Toda alteração no schema do Prisma que afete `payments` impacta estas Lambdas.

## Estrutura

```
src/aws/
├── template.yaml                              # SAM template (Infra as Code)
├── samconfig.toml                             # config de deploy (região us-east-2, stack "date-me")
├── package.json                               # dependencies locais: axios, pg (+ mocha/chai dev)
├── .gitignore / .npmignore
├── README.md
└── integration/
    ├── handlers/
    │   ├── extractor/
    │   │   └── payments-enqueue.js            # Lambda "payments-enqueue" - recebe POST /notification-payments
    │   └── loader/
    │       └── payments-load.js               # Lambda "payments-load"    - consome SQS e grava no Postgres
    └── helpers/
        ├── config/
        │   ├── settings.js                    # loadConfig() agrega envs do banco e queue
        │   ├── envvars.js                     # resolve "parameters://..." e "secrets://..." via SSM/SM
        │   ├── parameters.js                  # wrapper SSMClient (AWS SDK v3)
        │   └── secrets.js                     # wrapper SecretsManagerClient (AWS SDK v3)
        ├── database/
        │   └── database.js                    # Pool pg, consultSubscription(id), insertNewPayment(data)
        └── utils/
            ├── convert-data-payment.js        # convert(data, method) -> formato do INSERT (BOLETO/PIX/CREDIT_CARD)
            └── interfaces-db.js               # typedef JSDoc InsertPayment
```

## Recursos AWS declarados em `template.yaml`

| Recurso | Tipo | Propósito |
| --- | --- | --- |
| `DateMeApi` | `AWS::Serverless::Api` | API Gateway REST, stage `v1`, endpoint REGIONAL, CORS `*` |
| `PaymentsDLQ` | `AWS::SQS::Queue` | Dead-letter queue FIFO (`PaymentsDLQ.fifo`) |
| `PaymentsQueue` | `AWS::SQS::Queue` | Fila FIFO principal (`PaymentsQueue.fifo`), visibility 620s, `maxReceiveCount=2` → DLQ |
| `PaymentsEnqueue` | `AWS::Serverless::Function` | Lambda Node.js 20, handler `payments-enqueue.lambdaHandler`; evento `POST /notification-payments` |
| `PaymentsLoad` | `AWS::Serverless::Function` | Lambda Node.js 20, handler `payments-load.lambdaHandler`; evento SQS `PaymentsQueue` (batch 10, `ReportBatchItemFailures`) |

Globals em `template.yaml`: timeout 600s, memória 128MB, log JSON, envs do Postgres via `parameters://...` (SSM).

## Lambdas

### `payments-enqueue`

Arquivo: [`./integration/handlers/extractor/payments-enqueue.js`](./integration/handlers/extractor/payments-enqueue.js).

- Permissões IAM: `AWSLambda_FullAccess`, `AmazonRDSFullAccess`, `AmazonSSMReadOnlyAccess`, `AmazonSQSFullAccess`.
- Evento: POST `/notification-payments` (via `DateMeApi`).
- Ação: `JSON.parse(event.body)` → `SQSClient.send(SendMessageCommand)` com `MessageGroupId` e `MessageDeduplicationId`.
- **URL da fila hardcoded** em [`./integration/handlers/extractor/payments-enqueue.js:4`](./integration/handlers/extractor/payments-enqueue.js): `https://sqs.us-east-2.amazonaws.com/778826949454/PaymentsQueue.fifo`.
- **Região hardcoded:** `us-east-2`.

### `payments-load`

Arquivo: [`./integration/handlers/loader/payments-load.js`](./integration/handlers/loader/payments-load.js).

- Permissões IAM: `AWSLambda_FullAccess`, `AmazonSQSFullAccess`, `AmazonRDSFullAccess`, `AmazonSSMReadOnlyAccess`, `SecretsManagerReadWrite`.
- Evento: batch SQS (até 10 registros).
- Para cada `record`:
  1. `JSON.parse(record.body)` → `eventData`.
  2. Detecta método: `PIX` se `qr_codes[0].expiration_date`, senão `charges[0].payment_method.type` (BOLETO/CREDIT_CARD), ou `"DESCONHECIDO"`.
  3. `convert(eventData, method)` ([`./integration/helpers/utils/convert-data-payment.js`](./integration/helpers/utils/convert-data-payment.js)) monta `{amount, currency, chargesId, paymentMethod, paymentDetails, status}`.
  4. `consultSubscription(eventData.reference_id)` busca no banco.
  5. Monta `dataFormat` e chama `insertNewPayment` — `INSERT INTO payments(...)` com `crypto.randomUUID()` como `id`.
- Erro dentro do `for` relança → habilita re-enfileiramento/DLQ.

## Configuração / resolução de env vars

O helper [`./integration/helpers/config/envvars.js`](./integration/helpers/config/envvars.js) implementa um protocolo de URI na própria env var:

| Prefixo | Destino | Exemplo |
| --- | --- | --- |
| `parameters://<path>` | SSM Parameter Store (`GetParameterCommand` com `WithDecryption`) | `parameters:///database/postgres/development/password` |
| `secrets://<id>[?<key>]` | Secrets Manager (`GetSecretValueCommand`; se JSON, opcionalmente extrai `key`) | `secrets://db/prod?password` |
| (outro) | retorna direto `process.env[key] ?? defaultValue` | `"development"` |

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `ENVIRONMENT` | Referenciada por `template.yaml`; default `"development"` |
| `DATABASE_HOST` | Host Postgres. Em produção vem de SSM (`parameters://...`) |
| `DATABASE_USERNAME` | Usuário Postgres. Idem |
| `DATABASE_PASSWORD` | Senha Postgres. Idem (SSM com `WithDecryption`) |
| `DATABASE_PORT` | Porta Postgres. Idem |
| `DATABASE_NAME` | Nome do banco. Idem |
| `PAYMENTS_QUEUE_URL` | URL da SQS. Lido por `loadConfig` mas **não é usado** no loader; a URL usada pelo enqueuer é hardcoded no código |

## Dependências

### Node packages (`./package.json`)

- **`pg`** `^8.16.3` — driver Postgres direto (sem Prisma).
- **`axios`** `>=1.6.0` — declarado mas **não importado** em nenhum handler. Candidato a remoção.
- Dev: `mocha`, `chai` — testes não presentes (pasta `tests/unit/` não existe).

### AWS SDK (resolvido no runtime do Lambda)

- `@aws-sdk/client-sqs`
- `@aws-sdk/client-ssm`
- `@aws-sdk/client-secrets-manager`

### Runtime

- Node.js 20.x (fixado em `Globals.Function.Runtime`).

## Quem usa / como integra com o resto do projeto

- **Produtor das notificações:** PagSeguro chama POST `/v1/notification-payments` no API Gateway (stage `v1` + path `/notification-payments`).
- **Banco compartilhado:** grava em `payments` (mesmo banco Postgres do NestJS). Consulta `subscriptions` para preencher `userId`/`planId`.
- **Não** é importado pelo código NestJS — é um projeto separado com lifecycle próprio (deploy via `sam deploy`).

Os módulos NestJS [`../modules/pag-seguro/`](../modules/pag-seguro/) e [`../modules/payments/`](../modules/payments/) também processam pagamentos, mas via outro caminho (chamada síncrona ao PagSeguro e persistência pelo Prisma). Há **sobreposição de responsabilidade** — validar qual caminho é canônico.

## Como fazer deploy

Via AWS SAM CLI (config em `samconfig.toml`):

```bash
cd src/aws
sam build
sam deploy               # usa perfil "default", stack "date-me", região us-east-2
```

Parâmetros de deploy: `Environment=development` (único valor permitido em `template.yaml:10`).

## Pontos de atenção

- **URL da SQS hardcoded** em `payments-enqueue.js` — não troca de ambiente (development/staging/prod). Mover para env/SSM.
- **Região hardcoded** `us-east-2` em múltiplos lugares (SDK client + samconfig). Parametrizar.
- **`PAYMENTS_QUEUE_URL` não utilizado no loader** — `loadConfig()` resolve mas o handler enqueuer não chama `loadConfig`. Sem efeito.
- **`axios` declarado mas não usado.** Remover dependência.
- **`ssl: { rejectUnauthorized: false }`** em [`./integration/helpers/database/database.js:19`](./integration/helpers/database/database.js) desabilita validação de certificado — aceitável em dev, perigoso em produção.
- **`MessageGroupId` com `Math.random(0, 9)`** ([`./integration/handlers/extractor/payments-enqueue.js:16`](./integration/handlers/extractor/payments-enqueue.js)) — `Math.random` ignora argumentos; resultado é pseudo-aleatório entre 0-1. Isso **quebra a ordenação FIFO por grupo** (o objetivo é agrupar por `reference_id`). Provável bug.
- **Pipeline duplica a responsabilidade** dos módulos NestJS `pag-seguro`/`payments`. Mantê-los em sincronia é frágil.
- **SQL sem transação** em `insertNewPayment`. Para múltiplos pagamentos por batch, considerar `BEGIN/COMMIT`.
- **Permissões IAM excessivas** (`*FullAccess`, `SecretsManagerReadWrite`). Restringir ao mínimo necessário.
- **Sem validação de payload** no enqueuer — qualquer JSON vira mensagem. Atacante pode poluir a fila.
- **Handler de erro do enqueuer** retorna 500 mas ainda permite que o PagSeguro reenvie; analisar se isso causa duplicidade junto com o path NestJS.
- **Teste** declarado em `package.json` (`mocha tests/unit/`) — pasta `tests/` inexistente.
- **`default.validate.parameters.lint = true`** no samconfig — rodar `sam validate` antes de commitar mudanças em `template.yaml`.
- **`package.json` chamado `"hello_world"`** — legado do scaffold do `sam init`. Renomear.
