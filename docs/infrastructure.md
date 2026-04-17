# Infraestrutura

Este documento descreve a infraestrutura do projeto `Date-Me-Encontre-Aqui`: containers, automações via Makefile, Terraform (GCP), variáveis de ambiente, requisitos locais e scripts do `package.json`.

Todas as informações foram extraídas diretamente dos arquivos versionados no repositório.

---

## Containers

### Dockerfile

O `Dockerfile` na raiz do projeto define uma imagem Node.js única, orientada à execução da API NestJS em produção.

- **Imagem base:** `node:20-alpine`.
- **Diretório de trabalho:** `/app`.
- **Etapas principais:**
  1. Copia `package*.json` e executa `npm install --omit=dev` (instala apenas dependências de produção).
  2. Copia o restante do código-fonte para o container.
  3. Executa `npx prisma generate` para gerar o Prisma Client a partir do schema.
  4. Executa `npm run build` (invoca `nest build`, gerando a pasta `dist/`).
- **Porta exposta:** `3000` (`EXPOSE 3000`).
- **Entrypoint/CMD:** `CMD [ "npm", "run", "start:prod" ]`, que por sua vez executa `node dist/main`.

> A confirmar: o Dockerfile não possui stage multi-stage nem usuário não-root explícito; a instalação usa `--omit=dev` mesmo antes do build, o que depende das dependências necessárias para o build já estarem em `dependencies` (e não em `devDependencies`) do `package.json`.

### docker-compose.yml

O arquivo `docker-compose.yml` existe na raiz do repositório, porém está **vazio (0 bytes)**. Trata-se de um stub sem serviços definidos. Nenhuma orquestração local via `docker compose up` está disponível enquanto o arquivo estiver vazio.

### ollama-entrypoint.sh

Script auxiliar (shell POSIX, `#!/bin/sh`) para inicializar um container Ollama:

```sh
#!/bin/sh
ollama pull deepseek-r1:8b
ollama serve
```

- Faz pull do modelo `deepseek-r1:8b`.
- Inicia o servidor Ollama (`ollama serve`).

> A confirmar: não há `Dockerfile` separado que referencie este entrypoint no repositório; o consumo do script (imagem alvo, `docker-compose` dedicado, etc.) não está explícito nos arquivos versionados.

---

## Makefile

Variáveis definidas no topo do `Makefile`:

| Variável | Valor |
| --- | --- |
| `PROJECT_ID` | `integracaon8n-486515` |
| `REGION` | `us-central1` |
| `ENV` | `dev` |
| `PREFIX` | `date-me` |
| `IMAGE_NAME` | `gcr.io/$(PROJECT_ID)/$(PREFIX)-api:latest` |
| `BACKEND_CONFIG` | `tfenvs/config.gcs.tfbackend` |
| `VAR_FILE` | `tfenvs/terraform.tfvars` |

Targets disponíveis:

| Target | Comando | Efeito |
| --- | --- | --- |
| `deploy` | Invoca `build`, `push` e `apply` em sequência. | Pipeline completo: compila imagem Docker, envia ao GCR e aplica infraestrutura via Terraform. |
| `build` | `docker build -t $(IMAGE_NAME) .` | Constrói a imagem Docker local usando o `Dockerfile`. |
| `push` | `docker push $(IMAGE_NAME)` | Envia a imagem para o Google Container Registry (`gcr.io`). |
| `apply` | `terraform init -backend-config=$(BACKEND_CONFIG) -reconfigure` seguido de `terraform apply -auto-approve` com `-var="project_id=..."`, `-var="region=..."`, `-var="env=..."`, `-var="prefix=..."`. | Reconfigura o backend e aplica mudanças de infraestrutura aprovando automaticamente. |
| `infra` | `terraform apply -auto-approve` com as mesmas `-var` (sem `init`). | Atalho para aplicar Terraform quando a imagem já foi publicada no GCR. |
| `destroy` | `terraform destroy` com as mesmas `-var` (sem `-auto-approve`). | Remove os recursos provisionados, exigindo confirmação interativa. |

> Observação: o `VAR_FILE` está declarado mas não é usado por nenhum target atual; os targets passam variáveis uma a uma via `-var=...`.

---

## Terraform

A configuração Terraform está na raiz do projeto (arquivos `.tf`) e tem como alvo o Google Cloud Platform.

### Provider (`provider.tf`)

- **Provider:** `google` (`hashicorp/google`), versão fixada em `6.8.0` (ver `.terraform.lock.hcl`).
- **Versão mínima do Terraform:** `>= 1.7.2`.
- **Região padrão:** `us-central1`, **zona padrão:** `us-central1-a`.
- **Backend:** `gcs` (Google Cloud Storage), configurado via `tfenvs/config.gcs.tfbackend` (`bucket = "date-integracao"`, `prefix = "date-me"`).

### Variáveis (`variables.tf`)

| Nome | Tipo | Default | Descrição |
| --- | --- | --- | --- |
| `prefix` | `string` | (sem default) | Prefixo adicionado a todos os nomes de recursos. Normalmente o nome do repositório Git. |
| `project_id` | `string` | (sem default) | ID do projeto GCP no qual os recursos serão provisionados. |
| `region` | `string` | (sem default) | Região na qual os recursos serão provisionados. |
| `env` | `string` | (sem default) | Versão curta do ambiente em que o Terraform está sendo executado. |

Valores concretos para `dev` estão em `tfenvs/terraform.tfvars`:

```hcl
project_id = "integracaon8n-486515"
env        = "dev"
region     = "us-central1"
```

O `Makefile` passa `prefix=date-me` diretamente via `-var`.

### Recursos em `main.tf`

| Tipo | Nome | Atributos-chave |
| --- | --- | --- |
| `data "google_project"` | `current` | Lê o projeto GCP referenciado em `var.project_id` (usado para obter `number` e construir URLs). |
| `google_service_account` | `service_account` | `account_id = var.prefix`, `display_name = "Service Account for ${var.prefix} application."`, projeto `var.project_id`. |
| `google_cloud_run_v2_service` | `cloudrun_private_api` | Nome `${var.prefix}-public-api`; `deletion_protection = false`; template usa o service account local; container `gcr.io/${var.project_id}/${var.prefix}-api:latest` na porta `3000`; variáveis de ambiente definidas inline: `ENV`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `JWT_SECRET`, `PAGSEGURO_TOKEN`, `SMS_KEY`; `traffic` com `TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST` em 100%. |
| `google_cloud_run_service_iam_binding` | `cloudrun_service_iam_bindingg` | Concede `roles/run.invoker` ao serviço Cloud Run para `allUsers` (API pública). |

Também há `locals` com `service_account` (e-mail do SA) e `labels` (`service`, `terraform = "true"`).

> Alerta: o `main.tf` contém valores sensíveis em claro (strings de conexão do Neon, host/porta/senha do Redis Cloud, chaves e tokens marcadas como `VALOR_DO_SEU_ENV`). Esses valores devem sair do código e migrar para Secret Manager ou variáveis Terraform sensíveis. Como o arquivo está versionado, assume-se que as credenciais expostas já foram ou devem ser rotacionadas.

### Recursos em `queue.tf`

O `queue.tf` provisiona a malha de Pub/Sub utilizada para integrações com n8n (webhooks) e DLQs.

`locals` definidos neste arquivo:
- `cloudrun_url`: URL pública prevista do Cloud Run (`https://${name}-${project.number}.${region}.run.app`).
- `pubsub_service_account`: `service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`.

Tópicos (`google_pubsub_topic`):

| Nome Terraform | `name` GCP |
| --- | --- |
| `topic_reporting_reported_posts_queue` | `date-me-topic-reporting-reported-posts-queue` |
| `topic_reporting_reported_posts_dlq` | `reporting_reported_post_dlq` |
| `topic_reporting_reported_posts_resolved_queue` | `date-me-topic-reporting-reported-posts-resolved-queue` |
| `topic_reporting_reported_posts_resolved_dlq` | `reporting_reported_posts_resolved_dlq` |
| `topic_fila_um` | `date-me-topic-fila-um-queue` |
| `topic_fila_um_dlq` | `fila_um_dlq` |
| `topic_fila_dois` | `date-me-topic-fila-dois-queue` |
| `topic_fila_dois_dlq` | `fila_dois_dlq` |
| `topic_fila_tres` | `date-me-topic-fila-tres-queue` |
| `topic_fila_tres_dlq` | `fila_tres_dlq` |
| `topic_fila_quatro` | `date-me-topic-fila-quatro-queue` |
| `topic_fila_quatro_dlq` | `fila_quatro_dlq` |

Subscriptions (`google_pubsub_subscription`):

| Nome Terraform | Tipo | Destino (`push_endpoint`) |
| --- | --- | --- |
| `subscription_reporting_reported_posts_n8n` | Push | n8n via ngrok (`/webhook-test/1dcd872e-...`), com DLQ e `max_delivery_attempts = 5`. |
| `subscription_reporting_reported_posts_dlq` | Pull | DLQ do fluxo de reported posts. |
| `subscription_reporting_reported_posts_resolved_queue` | Push | `${cloudrun_url}/v1/reporting-reported-posts-resolved`, com DLQ. |
| `subscription_reporting_reported_posts_resolved_dlq` | Pull | DLQ do fluxo de resolved. |
| `subscription_reporting_reported_posts_resolved_zrok` | Push | Ambiente local/dev via `vcbfx3bq2n1h.share.zrok.io/v1/reporting-reported-posts-resolved`. |
| `subscription_fila_um_n8n` | Push | n8n via ngrok (`/webhook/4cb44f11-...`), DLQ. |
| `subscription_fila_um_dlq` | Pull | DLQ `topic_fila_um_dlq`. |
| `subscription_fila_dois_n8n` | Push | n8n via ngrok (`/webhook/3368bbc5-...`), DLQ. |
| `subscription_fila_dois_dlq` | Pull | DLQ `topic_fila_dois_dlq`. |
| `subscription_fila_tres_n8n` | Push | n8n via ngrok (`/webhook/67c74ef5-...`), DLQ. |
| `subscription_fila_tres_dlq` | Pull | DLQ `topic_fila_tres_dlq`. |
| `subscription_fila_quatro_n8n` | Push | n8n via ngrok (`/webhook/cee22f17-...`), DLQ. |
| `subscription_fila_quatro_dlq` | Pull | DLQ `topic_fila_quatro_dlq`. |

> Observação: as subscriptions `subscription_reporting_reported_posts_queue` e `subscription_fila_{um,dois,tres,quatro}_queue` (push direto para o Cloud Run com `/v1/...`) estão comentadas no código — não são criadas atualmente.

Permissões IAM (`queue.tf`):

| Tipo | Nome Terraform | Propósito |
| --- | --- | --- |
| `google_pubsub_topic_iam_member` | `pubsub_dlq_publisher` (for_each nos tópicos DLQ e filas) | Concede `roles/pubsub.publisher` ao service account do Pub/Sub para escrever nos tópicos listados. |
| `google_pubsub_subscription_iam_member` | `pubsub_subscriber_dlq_handler` (for_each nas subscriptions push) | Concede `roles/pubsub.subscriber` ao service account do Pub/Sub. Necessário para habilitar o atributo de DLQ no JSON retornado. |
| `google_pubsub_subscription_iam_member` | `n8n_access` (for_each nas subscriptions relevantes) | Concede `roles/pubsub.subscriber` ao service account `google_service_account.service_account` (usado pelo n8n para `pull`). |
| `google_project_iam_member` | `n8n_logging_viewer` | Concede `roles/logging.viewer` ao service account para leitura de logs no Cloud Logging. |

### Ambientes (`tfenvs/`)

O diretório `tfenvs/` concentra a configuração de ambiente Terraform:

| Arquivo | Conteúdo |
| --- | --- |
| `tfenvs/config.gcs.tfbackend` | Configuração do backend GCS: `bucket = "date-integracao"`, `prefix = "date-me"`. |
| `tfenvs/terraform.tfvars` | Valores para `project_id`, `env` e `region` (atualmente apontando para o ambiente `dev`). |

Atualmente existe apenas o ambiente `dev`; não há subdiretórios por ambiente.

### Estado do Terraform

O arquivo `terraform.tfstate` está **versionado no repositório** (presente na raiz, 181 bytes).

> Alerta importante: **não é recomendado** versionar `terraform.tfstate` no Git:
> - O state contém dados sensíveis em claro (outputs, tokens, IDs) e pode vazar segredos.
> - Não há bloqueio (lock) durante aplicações concorrentes, o que leva a corrupção de estado.
> - O arquivo deixa de refletir o que está realmente no GCP quando múltiplos operadores trabalham no projeto.
>
> **Recomendação:** usar o backend remoto já declarado em `provider.tf` (`backend "gcs"`) em conjunto com um mecanismo de lock. Como o projeto usa GCS, utilize a configuração nativa de lock via GCS Object Versioning. Caso migre para AWS, a convenção é **backend S3 + DynamoDB lock**. Além disso, adicione `terraform.tfstate` e `terraform.tfstate.backup` ao `.gitignore` e remova-os do histórico.

---

## Variáveis de ambiente

Tabela consolidada a partir de grep em `src/` (ver comandos abaixo). Cada linha foi verificada contra o arquivo de origem.

Comandos usados:

```bash
grep -rhoE "configService\\.get[<(]?[\"'<]?[A-Z_]+" src/ | sort -u
grep -rhoE "process\\.env\\.[A-Z_]+" src/ | sort -u
```

| Variável | Consumida em | Propósito |
| --- | --- | --- |
| `NODE_ENV` | `process.env.NODE_ENV` (bootstrap/runtime) | Indica o ambiente de execução (development, production, test). |
| `PORT` | `process.env.PORT` | Porta HTTP na qual a aplicação NestJS escuta. |
| `MOCK_PRISMA` | `process.env.MOCK_PRISMA` | Flag para alternar para um Prisma mockado em testes/locais. |
| `JWT_SECRET` | `process.env.JWT_SECRET`, `configService.get('JWT_SECRET')` em `auth.service.ts` e `jwt.strategy.ts` | Segredo usado para assinar/validar tokens JWT de acesso. |
| `JWT_EXPIRES_IN` | `auth.service.ts` (`configService.get('JWT_EXPIRES_IN')`, default `'15m'`) | Tempo de expiração do access token. |
| `JWT_REFRESH_SECRET` | `auth.service.ts` | Segredo usado para assinar/validar refresh tokens. |
| `JWT_REFRESH_EXPIRES_IN` | `auth.service.ts` (default `'60m'`) | Tempo de expiração do refresh token. |
| `REDIS_HOST` | `app.module.ts` (atualmente comentado) | Host do Redis usado para cache/filas. |
| `REDIS_PORT` | `app.module.ts` (comentado) | Porta do Redis. |
| `REDIS_PASSWORD` | `app.module.ts` (comentado) | Senha do Redis. |
| `REDIS_PRIVATE_URL` | `auth.module.ts` (`configService.get('REDIS_PRIVATE_URL')`) | URL completa do Redis para cache/rate limit usado no módulo `auth`. |
| `ANTHROPIC_API_KEY` | `process.env.ANTHROPIC_API_KEY`, `assistant_ai.module.ts` | Chave de API para integrações com Claude/Anthropic. |
| `GCP_PROJECT_ID` | `gcp.module.ts` | ID do projeto GCP usado pelos clientes Pub/Sub. |
| `GOOGLE_APPLICATION_CREDENTIALS` | `gcp.module.ts` | Caminho para o JSON de service account usado pelos SDKs Google. |
| `TOKEN_PAGSEGURO` | `pag-seguro.service.ts`, `pag-seguro.module.ts` | Token Bearer para chamar a API do PagSeguro/PagBank. |
| `URL_BASE` | `pag-seguro.module.ts` | URL base do serviço PagSeguro (sandbox vs produção). |
| `NOTIFICATION_PAYMENTS_URL` | `pag-seguro.service.ts` | URL registrada como `notification_urls[0]` em ordens de pagamento. |
| `PAGBANK_WEBHOOK_SECRET` | `pag-seguro.service.ts` | Segredo usado na verificação HMAC do webhook do PagBank. |
| `TELESIGN_API_KEY` | `process.env.TELESIGN_API_KEY` | Chave de API do Telesign para envio de SMS. |
| `TELESIGN_CUSTOMER_ID` | `process.env.TELESIGN_CUSTOMER_ID` | Customer ID do Telesign. |

Observações adicionais:

- O `main.tf` também define, diretamente no container do Cloud Run, as variáveis: `ENV`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `JWT_SECRET`, `PAGSEGURO_TOKEN`, `SMS_KEY`. Os nomes `PAGSEGURO_TOKEN` e `SMS_KEY` divergem dos usados no código (`TOKEN_PAGSEGURO`, `TELESIGN_API_KEY`/`TELESIGN_CUSTOMER_ID`).

> A confirmar: os nomes divergentes (`PAGSEGURO_TOKEN` vs `TOKEN_PAGSEGURO`; `SMS_KEY` sem consumo direto no código) indicam um desalinhamento entre a configuração de infraestrutura (`main.tf`) e o código em `src/`. É necessário padronizar antes do próximo deploy para evitar integrações quebradas.

---

## Requisitos locais

Ferramentas necessárias para rodar o projeto localmente (a partir do `Dockerfile`, `package.json` e configuração atual):

- **Node.js 20.x** — alinhado à imagem `node:20-alpine` do `Dockerfile`. O `package.json` não declara bloco `engines`, portanto a versão é implícita.
- **npm** — gerenciador de pacotes embutido no Node.js.
- **PostgreSQL** — exigido pelo Prisma (consumido via `DATABASE_URL`, ver `prisma/` e `main.tf`).
- **Redis (opcional)** — o bloco de configuração do Redis em `src/app.module.ts` está **comentado**, portanto não é obrigatório para rodar a API atualmente. Se for habilitado, os módulos `auth` (`REDIS_PRIVATE_URL`) e, eventualmente, `app` (`REDIS_HOST`/`PORT`/`PASSWORD`) passarão a exigi-lo.
- **Docker** — necessário para `make build`/`make push`.
- **Terraform** `>= 1.7.2` — para aplicar infraestrutura (`make apply`/`make infra`/`make destroy`).
- **gcloud CLI** — implícito, para autenticação no GCR/GCS/Cloud Run quando executando `make push` e `make apply`.

> A confirmar: versões mínimas de PostgreSQL, Docker e gcloud não estão declaradas nos arquivos do projeto.

---

## Scripts do `package.json`

| Script | Comando | Uso |
| --- | --- | --- |
| `build` | `nest build` | Compila o projeto TypeScript/NestJS para `dist/`. |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Formata todos os arquivos TS em `src/` e `test/`. |
| `start` | `nest start` | Sobe a aplicação em modo padrão (sem watch). |
| `start:dev` | `nest start --watch` | Sobe em modo desenvolvimento, com hot reload. |
| `start:debug` | `nest start --debug --watch` | Sobe em modo debug com watch (inspector habilitado). |
| `start:prod` | `node dist/main` | Executa o bundle compilado; usado pelo `CMD` do `Dockerfile`. |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Rodar ESLint com correção automática nos diretórios de código. |
| `test` | `jest` | Executa a suíte de testes unitários conforme config em `package.json` (`jest` root `src`, `testRegex` `.*\.spec\.ts$`). |
| `test:watch` | `jest --watch` | Roda Jest em modo watch. |
| `test:cov` | `jest --coverage` | Roda Jest e gera relatório de cobertura em `coverage/`. |
| `test:debug` | `node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand` | Debug de testes com inspector, sem paralelização. |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | Roda a suíte end-to-end com configuração dedicada em `test/jest-e2e.json`. |

---

## Resumo operacional

- **Deploy completo:** `make deploy` (build Docker -> push GCR -> terraform apply).
- **Só infra:** `make infra` (assume imagem já publicada).
- **Teardown:** `make destroy` (interativo).
- **Ambiente único:** `dev`, configurado via `tfenvs/terraform.tfvars` e `tfenvs/config.gcs.tfbackend`.
- **Ações imediatas recomendadas:**
  - Parar de versionar `terraform.tfstate` e confiar no backend GCS remoto.
  - Remover segredos em claro de `main.tf` (Neon, Redis, etc.) e mover para Secret Manager.
  - Padronizar nomes de variáveis de ambiente entre `main.tf` e o código (`PAGSEGURO_TOKEN` vs `TOKEN_PAGSEGURO`, `SMS_KEY` vs `TELESIGN_*`).
  - Preencher ou remover `docker-compose.yml` (atualmente stub vazio).
