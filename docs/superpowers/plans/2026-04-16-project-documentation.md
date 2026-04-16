# Plano de Implementação — Documentação completa do projeto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir documentação exaustiva em pt-BR para os 18 módulos NestJS, 2 diretórios raiz (`src/aws`, `src/llm-service`), o diretório utilitário `src/modules/common` e 6 documentos transversais em `docs/`, sem alterar nenhuma linha de código de produção.

**Architecture:** Cada módulo recebe `README.md` seguindo um template fixo de 11 seções (propósito, regras de negócio, entidades, API GraphQL, DTOs, fluxos, dependências, autorização, erros, manutenção, testes). Documentos transversais em `docs/` fornecem visão global (arquitetura, ERD, regras de negócio, infra, convenções). Ordem: docs transversais primeiro, depois módulos por dependência (base → consumidores). Commits granulares.

**Tech Stack:** Markdown (GitHub-flavored) + diagramas Mermaid (`erDiagram`, `sequenceDiagram`, `flowchart`). Sem geradores automáticos — tudo escrito à mão, conferido contra o código-fonte.

**Ponto de partida:** Branch `docs/modules-documentation` (já criada), spec já commitado em `docs/superpowers/specs/2026-04-16-project-documentation-design.md`.

---

## Regras globais aplicáveis a TODAS as tasks

**R1 — Anti-alucinação.** Só escrever o que foi verificado no código. Se algo for incerto, marcar com `> ⚠️ **A confirmar:** <motivo>`. Nunca inferir regra de negócio a partir de nome de variável.

**R2 — Zero alteração de código.** Nunca editar `.ts`, `.js`, `.prisma`, `.tf`, `Dockerfile`, `Makefile`, `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.mjs`, `.prettierrc`, `nest-cli.json`, `schema.gql`. Se tocar em qualquer um desses, reverter imediatamente.

**R3 — Sem emojis.** Nenhum emoji em nenhum arquivo gerado.

**R4 — Template fixo.** Todo README de módulo precisa das 11 seções (`## 1. Propósito` até `## 11. Testes`). Seções inaplicáveis ganham "Não se aplica" em vez de serem removidas.

**R5 — Links relativos.** Links entre docs usam caminhos relativos (ex.: `../../docs/data-model.md` a partir de `src/modules/users/README.md`).

**R6 — Commits granulares.** Um commit por doc transversal; um commit por README de módulo. Mensagem no formato `docs(<escopo>): <descrição>`.

**R7 — Sem alterar o `README.md` raiz.**

**Verificação pós-escrita de cada README de módulo (padrão reutilizado):**
```bash
# Confirma as 11 seções no README recém-escrito
for n in 1 2 3 4 5 6 7 8 9 10 11; do
  grep -q "^## ${n}\. " <caminho-do-README> || echo "FALTA SEÇÃO ${n}"
done
# Confirma que apenas arquivos .md foram alterados
git diff --cached --name-only | grep -v '\.md$' && echo "ERRO: arquivo não-md staged"
```

---

## Fase 1 — Documentos transversais em `docs/`

### Task 1: `docs/data-model.md` (ERD e tabelas de entidades)

**Por que primeiro?** Todo README de módulo referencia entidades. Ter o ERD pronto vira referência única.

**Files:**
- Create: `docs/data-model.md`
- Read (referência): `prisma/schema.prisma`

- [ ] **Step 1: Ler o schema completo**

```bash
cat prisma/schema.prisma | wc -l   # esperado: ~220 linhas
```

Identificar os 11 modelos: `User`, `Address`, `Role`, `Plan`, `Subscription`, `SubscriptionStatus`, `Payment`, `Post`, `Comment`, `Complaint`, e quaisquer outros que aparecerem.

- [ ] **Step 2: Escrever `docs/data-model.md` com esta estrutura**

```markdown
# Modelo de Dados

Schema Prisma completo em [`prisma/schema.prisma`](../prisma/schema.prisma).
Banco: PostgreSQL. Convenção de nome das tabelas: `@@map` snake_case.

## Diagrama ER

\`\`\`mermaid
erDiagram
  USER ||--o| ADDRESS : possui
  USER }o--|| ROLE : pertence_a
  USER ||--o{ SUBSCRIPTION : assina
  USER ||--o{ PAYMENT : realiza
  USER ||--o{ POST : publica
  USER ||--o{ COMMENT : comenta
  PLAN ||--o{ SUBSCRIPTION : oferece
  PLAN ||--o{ PAYMENT : cobra
  SUBSCRIPTION }o--|| SUBSCRIPTION_STATUS : tem
  SUBSCRIPTION ||--o{ PAYMENT : gera
  POST ||--o{ COMMENT : recebe
  POST ||--o{ COMPLAINT : alvo_de
  COMMENT ||--o{ COMPLAINT : alvo_de
  COMMENT ||--o{ COMMENT : responde
\`\`\`

## Entidades

### User (`users`)
| Campo | Tipo | Nullable | Default | Observação |
| --- | --- | --- | --- | --- |
| id | String (uuid) | não | uuid() | PK |
| fullName | String | não | | |
| nickName | String | não | | |
| email | String | não | | `@unique` |
| password | String | não | | hash bcrypt (ver módulo auth) |
| smartphone | String | não | | usado pelo SMS |
| birthdate | DateTime | não | | |
| cpf | String | não | | `@unique` |
| deletedAt | DateTime | sim | | soft-delete |
| createdAt | DateTime | não | now() | |
| updatedAt | DateTime | sim | @updatedAt | |
| status | String | não | "PENDING" | ciclo: PENDING → ATIVO |
| verificationCode | Int | não | | código SMS de verificação |
| resetPasswordToken | String | sim | | |
| isOnline | Boolean | sim | false | |
| lastLogin | DateTime | sim | | |
| roleId | Int | não | | FK para `roles` |

Relações: 1:1 opcional com `Address`, N:1 com `Role`, 1:N com `Subscription`, `Payment`, `Post`, `Comment`.

### Address (`addresses`)
[repetir padrão — todos os campos da model]

### Role (`roles`)
[...]

### Plan (`plans`)
[...]

### Subscription (`subscriptions`)
[...]

### SubscriptionStatus (`subscription_status`)
[...]

### Payment (`payments`)
[...]

### Post (`posts`)
[...]

### Comment (`comments`)
[...]

### Complaint (`complaints`)
[...]

## Cardinalidades explicadas

- Um `User` tem no máximo um `Address` (relacionamento 1:1 opcional; FK `addresses.userId @unique`).
- Um `User` tem exatamente uma `Role` (FK obrigatória).
- Uma `Subscription` liga um `User` a um `Plan` e tem um `SubscriptionStatus`.
- Um `Payment` sempre referencia `User`, `Plan` e `Subscription`.
- Um `Comment` pode ter `parentId` → comentários aninhados (auto-relacionamento).
- Um `Complaint` tem `postId` OU `commentId` (ambos opcionais no schema — validar em service).

## Soft-delete

Modelos com `deletedAt`: `User`, `Plan`, `SubscriptionStatus`, `Subscription`, `Post`, `Comment` (conferir cada). Consultas devem filtrar `deletedAt: null` explicitamente (Prisma não aplica escopo global por padrão).

## Migrations

Ver `prisma/migrations/` para histórico de mudanças do schema.
```

Preencher todas as tabelas com os campos reais lidos do `schema.prisma`. Não omitir campos.

- [ ] **Step 3: Verificar**

Run: `grep -c "^### " docs/data-model.md`
Expected: ≥ 11 (uma subseção por entidade) + 1 (Diagrama) + 1 (Cardinalidades) + 1 (Soft-delete) + 1 (Migrations) = ≥ 15

Run: `git diff --stat`
Expected: apenas `docs/data-model.md` criado, 0 arquivos de código alterados.

- [ ] **Step 4: Commit**

```bash
git add docs/data-model.md
git commit -m "docs(data-model): add full ER diagram and entity tables

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`
- Read: `src/main.ts`, `src/app.module.ts`, `nest-cli.json`, `src/schema.gql`

- [ ] **Step 1: Ler arquivos de bootstrap**

```bash
cat src/main.ts src/app.module.ts
```

Catalogar: configuração do Apollo (playground, introspection, path `/graphql`), módulos incluídos no schema GraphQL (`include: [...]`), e integrações (Redis comentado, ScheduleModule, ConfigModule).

- [ ] **Step 2: Escrever `docs/architecture.md`**

```markdown
# Arquitetura

## Visão geral

Aplicação monolítica modular NestJS 11 com API GraphQL (Apollo Server + code-first).
Persistência via Prisma sobre PostgreSQL. Integrações com AWS, GCP, PagSeguro,
Twilio/TeleSign (SMS) e LangChain/Ollama (IA).

## Diagrama de contêineres (C4 nível 2)

\`\`\`mermaid
flowchart LR
  Client[Cliente Web/Mobile]
  Apollo[Apollo GraphQL<br/>/graphql]
  Nest[NestJS App]
  Prisma[(Prisma Client)]
  PG[(PostgreSQL)]
  S3[(AWS S3)]
  SQS[(AWS SQS)]
  SNS[(AWS SNS)]
  Sec[(AWS Secrets Mgr)]
  SSM[(AWS SSM)]
  PagSeg[(PagSeguro API)]
  Twilio[(Twilio/TeleSign)]
  GCP[(GCP Pub/Sub)]
  Ollama[(Ollama LLM)]
  Redis[(Redis - opcional)]

  Client -->|GraphQL/HTTPS| Apollo
  Apollo --> Nest
  Nest --> Prisma --> PG
  Nest --> S3
  Nest --> SQS
  Nest --> SNS
  Nest --> Sec
  Nest --> SSM
  Nest --> PagSeg
  Nest --> Twilio
  Nest --> GCP
  Nest --> Ollama
  Nest -.->|desabilitado<br/>no app.module| Redis
\`\`\`

## Camadas internas

\`\`\`mermaid
flowchart TD
  R[Resolver / Controller]
  S[Service]
  P[PrismaService]
  E[Integração externa]
  R --> S
  S --> P
  S --> E
\`\`\`

- **Resolver/Controller** — adapta GraphQL/HTTP para chamada de service. Nunca contém regra de negócio.
- **Service** — contém regra de negócio, orquestra Prisma e integrações.
- **PrismaService** — cliente único injetado via `PrismaModule`.

## Módulos expostos no schema GraphQL

Configurados em `src/app.module.ts` via `include: [...]`:
- AuthModule, PagSeguroModule, PlansModule, SubscriptionsModule,
  SubscriptionStatusModule, PaymentsModule, PostsModule,
  UploadMediasModule, ComplaintsModule.

Demais módulos (`UsersModule`, `AddressesModule`, `RolesModule`, `SmsModule`,
`AssistantAiModule`, `CommentsModule`, `GcpModule`, `ReportingModule`) ficam
fora do schema GraphQL — usados internamente por outros módulos ou via REST/outros
transportes. Verificar cada módulo para detalhes.

## Autenticação

- Passport + JWT (`@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`).
- Guard principal: `JwtAuthGuard` (ver `src/modules/auth/guards/`).
- Autorização por role via `RolesGuard` e decorator `@Roles()`.
- Detalhes em [`../src/modules/auth/README.md`](../src/modules/auth/README.md).

## Bootstrap

- Entry-point: [`src/main.ts`](../src/main.ts).
- Porta: conferir `main.ts` (variável de ambiente ou default).
- Playground GraphQL habilitado (`playground: true`) — considerar desligar em produção.
- `introspection: true` — idem.

## Execução

- Local (dev): `npm run start:dev` (watch).
- Container: ver `Dockerfile` e `docker-compose.yml` em [`infrastructure.md`](./infrastructure.md).
- Produção: `npm run build` + `npm run start:prod`.
```

- [ ] **Step 3: Verificar**

Run: `grep -c "^##" docs/architecture.md`
Expected: ≥ 6

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): add C4 container diagram and layer description

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: `docs/business-rules.md`

**Files:**
- Create: `docs/business-rules.md`
- Read: `prisma/schema.prisma`, `src/modules/auth/auth.service.ts`, `src/modules/users/users.service.ts`, `src/modules/subscriptions/subscriptions.service.ts`, `src/modules/plans/plans.service.ts`, `src/modules/complaints/complaints.service.ts`, `src/modules/posts/posts.service.ts`

- [ ] **Step 1: Grep por validações e regras**

```bash
# Estados possíveis
grep -rn "PENDING\|ACTIVE\|ATIVO\|INACTIVE" src/modules --include="*.ts" | head -40
# Defaults do schema
grep -n "@default" prisma/schema.prisma
# Guards e roles aplicados
grep -rn "@Roles\|@UseGuards" src/modules --include="*.ts" | head -40
```

Anotar: estados do User, estados da Subscription, roles existentes, regras em services (ifs que validam antes de persistir).

- [ ] **Step 2: Escrever `docs/business-rules.md`**

```markdown
# Regras de Negócio Transversais

As regras abaixo atravessam mais de um módulo. Regras específicas de cada módulo
ficam no README correspondente. **Toda afirmação aqui foi verificada no código**
(referência ao arquivo indicada). Itens não verificáveis aparecem como
`> ⚠️ **A confirmar**`.

## 1. Ciclo de vida do usuário

- Cadastro cria `User.status = "PENDING"` (default em [`prisma/schema.prisma:29`](../prisma/schema.prisma)).
- `verificationCode` (Int) é gerado e enviado por SMS (módulo `sms`).
- Após validação, o status é atualizado para `ATIVO` (conferir `users.service.ts`).
- `isOnline` e `lastLogin` são atualizados pelo fluxo de login/logout (conferir `auth.service.ts`).
- Soft-delete via `deletedAt` — usuário deletado não é removido fisicamente.

> ⚠️ **A confirmar:** set exato de status possíveis (além de PENDING/ATIVO) — conferir no código do módulo `users`.

## 2. Papéis (Roles)

Role é FK obrigatória em `User`. A tabela `roles` é seed-ada (conferir migrations ou endpoint).
Roles conhecidas aparecem no decorator `@Roles(...)` em resolvers. Referência ao módulo
[`../src/modules/roles/README.md`](../src/modules/roles/README.md).

## 3. Modelo de assinatura

- `Plan` descreve o produto (nome, preço em centavos, descrição, `isActive`).
- `Subscription` liga `User` + `Plan` + `SubscriptionStatus`.
  - `autoRenew`, `trialEnd`, `discount` opcionais.
  - `amount` armazenado em centavos.
- `SubscriptionStatus` é catálogo (`slug`, `description`).
- `Payment` é gerado a cada cobrança, referenciando `User`, `Plan`, `Subscription`.

Fluxo canônico: criar Subscription → disparar cobrança via PagSeguro → gravar Payment →
atualizar SubscriptionStatus conforme resposta.

Detalhes: [`../src/modules/subscriptions/README.md`](../src/modules/subscriptions/README.md),
[`../src/modules/payments/README.md`](../src/modules/payments/README.md),
[`../src/modules/pag-seguro/README.md`](../src/modules/pag-seguro/README.md).

## 4. Gate "Ultimate"

Conteúdo pago é acessível somente a usuários com assinatura ativa em plano marcado
como Ultimate. Regra aplicada em `posts.service.ts` (conferir como é verificado — por
nome do plano ou por flag).

> ⚠️ **A confirmar:** critério exato para considerar um plano "Ultimate" (nome do
> plano? flag no schema? conferir no código do módulo `plans`/`posts`).

## 5. Moderação de conteúdo

- Usuário pode abrir `Complaint` sobre um `Post` ou um `Comment`.
- `Complaint.status` inicia em `"PENDING"`.
- Campo `analysesComplaints` (Json) guarda saída da análise por IA
  (`assistant_ai`, usando LangChain + Ollama).
- `appraiser` identifica quem fez a análise/moderação humana final.

Detalhes: [`../src/modules/complaints/README.md`](../src/modules/complaints/README.md),
[`../src/modules/assistant_ai/README.md`](../src/modules/assistant_ai/README.md).

## 6. Soft-delete

Modelos com `deletedAt` não são removidos fisicamente. Todas as queries de leitura
devem filtrar `deletedAt: null` — Prisma não aplica filtro global. Conferir em cada
service.

## 7. Upload de mídias

Posts podem carregar múltiplas imagens (array) e um vídeo. O storage é AWS S3 via
`upload-medias`. Arquivos trafegam por `graphql-upload` ou endpoint REST dedicado.
Detalhes: [`../src/modules/upload-medias/README.md`](../src/modules/upload-medias/README.md).
```

- [ ] **Step 3: Verificar seções**

Run: `grep -c "^## " docs/business-rules.md`
Expected: ≥ 7

- [ ] **Step 4: Commit**

```bash
git add docs/business-rules.md
git commit -m "docs(business-rules): document cross-module invariants

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: `docs/conventions.md`

**Files:**
- Create: `docs/conventions.md`
- Read: `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `nest-cli.json`, `src/modules/common/pagination.input.ts`, um módulo exemplo (ex.: `users`)

- [ ] **Step 1: Escrever `docs/conventions.md`**

```markdown
# Convenções de Código

## Estrutura padrão de um módulo NestJS

Cada módulo em `src/modules/<nome>/` contém:

\`\`\`
<nome>/
├── <nome>.module.ts       # definição do NestModule
├── <nome>.resolver.ts     # GraphQL resolver (ou .controller.ts para REST)
├── <nome>.service.ts      # regra de negócio
├── <nome>.resolver.spec.ts
├── <nome>.service.spec.ts
├── dto/                   # inputs e args GraphQL (com class-validator)
├── entities/              # object types GraphQL (schema code-first)
├── enum/ (opcional)       # enums registrados no GraphQL
└── README.md              # documentação do módulo (este projeto)
\`\`\`

## GraphQL code-first

- Schema gerado automaticamente em `src/schema.gql` a partir dos decorators
  (`@ObjectType`, `@Field`, `@InputType`, `@Query`, `@Mutation`).
- Config em [`src/app.module.ts`](../src/app.module.ts): `autoSchemaFile`.
- Nunca editar `schema.gql` à mão — é saída.

## Validação

- `class-validator` + `class-transformer` em todos os DTOs.
- `ValidationPipe` global é aplicado? Conferir em `src/main.ts` e documentar.

## Autorização

- `JwtAuthGuard` aplicado com `@UseGuards`.
- Decorator `@Roles('admin', 'user')` + `RolesGuard` para granularidade.
- Ver `src/modules/auth/decorators/` e `src/modules/auth/guards/`.

## Paginação

Input reutilizável em
[`../src/modules/common/pagination.input.ts`](../src/modules/common/pagination.input.ts).
Quando um resolver paginar, deve aceitar esse input e retornar total + items.

## Prisma

- Cliente único em `PrismaService` ([`../src/modules/prisma/prisma.service.ts`](../src/modules/prisma/prisma.service.ts)).
- `PrismaModule` é importado por quase todos os módulos que acessam banco.
- Soft-delete manual via filtro `deletedAt: null`.

## Lint e formatação

- `eslint.config.mjs` — regras TypeScript + Prettier.
- `.prettierrc` — formatação.
- Rodar: `npm run lint` e `npm run format`.

## Testes

- Jest (configurado em `package.json` → `jest`).
- `*.spec.ts` ao lado dos arquivos.
- Rodar: `npm test`, `npm run test:watch`, `npm run test:cov`.
- E2E: `npm run test:e2e` (config em `test/jest-e2e.json`).

## Commits

Formato observado nos commits existentes: livre. Este projeto adota
`docs(<escopo>): <descrição>` para commits de documentação.

## Manutenção da documentação

- Toda alteração em um módulo deve vir acompanhada de atualização do
  `src/modules/<mod>/README.md`.
- ERD (`docs/data-model.md`) deve refletir o `schema.prisma` atual — atualizar
  quando houver migration que altere modelos.
```

- [ ] **Step 2: Verificar**

Run: `grep -c "^## " docs/conventions.md`
Expected: ≥ 8

- [ ] **Step 3: Commit**

```bash
git add docs/conventions.md
git commit -m "docs(conventions): document module structure and coding standards

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: `docs/infrastructure.md`

**Files:**
- Create: `docs/infrastructure.md`
- Read: `Dockerfile`, `docker-compose.yml`, `Makefile`, `ollama-entrypoint.sh`, `main.tf`, `provider.tf`, `variables.tf`, `queue.tf`, conteúdo de `tfenvs/`

- [ ] **Step 1: Ler e catalogar recursos**

```bash
wc -l Dockerfile docker-compose.yml Makefile main.tf queue.tf provider.tf variables.tf
ls tfenvs/
# Levantar todas as variáveis de ambiente consumidas pelo código
grep -rhoE 'configService\.get[<(]?["'\''<]?[A-Z_]+' src/ | sort -u
grep -rhoE 'process\.env\.[A-Z_]+' src/ | sort -u
```

- [ ] **Step 2: Escrever `docs/infrastructure.md`**

```markdown
# Infraestrutura

## Containers

### Dockerfile
Imagem base, etapas de build, entrypoint — descrever com base na leitura real
do arquivo. Não inventar etapas.

### docker-compose.yml
> ⚠️ **A confirmar:** o arquivo existe mas está vazio na leitura inicial
> (0 bytes). Documentar como "stub — serviços locais não estão versionados".

### ollama-entrypoint.sh
Script shell que inicializa o container Ollama. Conteúdo resumido com base na
leitura real.

## Makefile

Listar cada target definido e o que faz (tabela com comando + efeito). Levantar
via `grep -E '^[a-zA-Z0-9_-]+:' Makefile`.

## Terraform

### Provider
Em `provider.tf`: provedor AWS, região, versão.

### Variáveis
Em `variables.tf`: listar cada variável (name, type, default, description).

### Recursos principais
- `main.tf`: recursos listados (ler e descrever).
- `queue.tf`: filas SQS e tópicos SNS — listar name, atributos, policy.

### Ambientes
Pasta `tfenvs/` contém arquivos `.tfvars` por ambiente. Listar arquivos
encontrados e propósito de cada um (se identificável).

### Estado
`terraform.tfstate` está versionado no repositório (arquivo de 181 bytes).
> ⚠️ **Atenção:** versionar tfstate no Git é, em geral, desencorajado.
> Avaliar mover para backend remoto (S3 + DynamoDB lock).

## Variáveis de ambiente

Tabela consolidada (levantada por grep em `src/`):

| Variável | Consumida em | Propósito |
| --- | --- | --- |
| `DATABASE_URL` | `prisma` | conexão Postgres |
| `JWT_SECRET` | `auth` | assinatura JWT |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `app.module.ts` (comentado) | cache (desabilitado) |
| `AWS_*` | `aws/`, `upload-medias` | credenciais AWS |
| `PAG_SEGURO_*` | `pag-seguro` | credenciais PagSeguro |
| `TWILIO_*` / `TELESIGN_*` | `sms` | envio SMS |
| `GCP_*` | `gcp` | credenciais GCP |
| `OLLAMA_*` | `llm-service`, `assistant_ai` | endpoint LLM |

(Preencher a lista final após o grep real.)

## Requisitos locais

- Node.js (versão conferir em `.nvmrc`/`package.json.engines` se presente).
- PostgreSQL.
- Redis (opcional — módulo comentado).
- Docker (para Ollama local).

## Scripts do `package.json`

| Script | Comando |
| --- | --- |
| build | `nest build` |
| start / start:dev / start:debug / start:prod | NestJS start variants |
| lint | ESLint --fix |
| format | Prettier --write |
| test / test:watch / test:cov / test:e2e | Jest variants |
```

- [ ] **Step 3: Verificar**

Run: `grep -c "^## " docs/infrastructure.md`
Expected: ≥ 6

- [ ] **Step 4: Commit**

```bash
git add docs/infrastructure.md
git commit -m "docs(infrastructure): document Docker, Terraform, env vars, Makefile

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: `docs/README.md` (índice)

**Files:**
- Create: `docs/README.md`

- [ ] **Step 1: Escrever índice**

```markdown
# Documentação — Date: Me Encontre Aqui

Plataforma de encontros adultos (NestJS + GraphQL + Prisma/Postgres) com match, bate-papo,
sistema de assinaturas e venda de conteúdo para assinantes Ultimate.

## Como navegar

1. Comece por [`architecture.md`](./architecture.md) para visão geral.
2. Veja o [`data-model.md`](./data-model.md) para o ERD.
3. Leia [`business-rules.md`](./business-rules.md) para regras de negócio transversais.
4. Para um módulo específico, abra `src/modules/<mod>/README.md`.

## Índice

### Transversal

| Doc | Assunto |
| --- | --- |
| [architecture.md](./architecture.md) | Arquitetura C4, camadas, bootstrap |
| [data-model.md](./data-model.md) | ERD e entidades Prisma |
| [business-rules.md](./business-rules.md) | Regras de negócio que cruzam módulos |
| [infrastructure.md](./infrastructure.md) | Docker, Terraform, env vars |
| [conventions.md](./conventions.md) | Padrões de código |

### Módulos

| Módulo | Doc |
| --- | --- |
| addresses | [../src/modules/addresses/README.md](../src/modules/addresses/README.md) |
| assistant_ai | [../src/modules/assistant_ai/README.md](../src/modules/assistant_ai/README.md) |
| auth | [../src/modules/auth/README.md](../src/modules/auth/README.md) |
| comments | [../src/modules/comments/README.md](../src/modules/comments/README.md) |
| common | [../src/modules/common/README.md](../src/modules/common/README.md) |
| complaints | [../src/modules/complaints/README.md](../src/modules/complaints/README.md) |
| gcp | [../src/modules/gcp/README.md](../src/modules/gcp/README.md) |
| pag-seguro | [../src/modules/pag-seguro/README.md](../src/modules/pag-seguro/README.md) |
| payments | [../src/modules/payments/README.md](../src/modules/payments/README.md) |
| plans | [../src/modules/plans/README.md](../src/modules/plans/README.md) |
| posts | [../src/modules/posts/README.md](../src/modules/posts/README.md) |
| prisma | [../src/modules/prisma/README.md](../src/modules/prisma/README.md) |
| reporting | [../src/modules/reporting/README.md](../src/modules/reporting/README.md) |
| roles | [../src/modules/roles/README.md](../src/modules/roles/README.md) |
| sms | [../src/modules/sms/README.md](../src/modules/sms/README.md) |
| subscriptions | [../src/modules/subscriptions/README.md](../src/modules/subscriptions/README.md) |
| subscription-status | [../src/modules/subscription-status/README.md](../src/modules/subscription-status/README.md) |
| upload-medias | [../src/modules/upload-medias/README.md](../src/modules/upload-medias/README.md) |
| users | [../src/modules/users/README.md](../src/modules/users/README.md) |

### Pastas raiz documentadas

| Pasta | Doc |
| --- | --- |
| src/aws | [../src/aws/README.md](../src/aws/README.md) |
| src/llm-service | [../src/llm-service/README.md](../src/llm-service/README.md) |

## Glossário

- **Plan** — produto de assinatura (ex.: Free, Ultimate).
- **Subscription** — relação ativa entre `User` e `Plan`.
- **SubscriptionStatus** — catálogo de estados (ativa, suspensa, cancelada, etc.).
- **Payment** — registro de cobrança.
- **Ultimate** — nível de assinatura que libera conteúdo pago.
- **Complaint** — denúncia de `Post` ou `Comment` para moderação.
- **Match** — conexão entre dois usuários. (conferir implementação)
- **Role** — papel do usuário (ex.: user, admin, moderator).
```

- [ ] **Step 2: Commit**

```bash
git add docs/README.md
git commit -m "docs: add documentation index and glossary

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Fase 2 — READMEs de módulos-base

A partir daqui, todos os READMEs seguem o **mesmo template de 11 seções**. O procedimento de cada task é idêntico em estrutura:

**Procedimento genérico (aplicado em Tasks 7 a 26):**

- [ ] **Step A: Ler o módulo.** Ler `<mod>.module.ts`, `<mod>.resolver.ts` (ou `.controller.ts`), `<mod>.service.ts`, arquivos em `dto/` e `entities/`, `*.spec.ts`. Grep reverso: `grep -rn "<ModName>Module" src --include="*.ts"` para descobrir quem importa.

- [ ] **Step B: Escrever `src/modules/<mod>/README.md`** com as 11 seções abaixo.

- [ ] **Step C: Verificar seções (bloco reutilizável):**

```bash
for n in 1 2 3 4 5 6 7 8 9 10 11; do
  grep -q "^## ${n}\. " src/modules/<mod>/README.md || echo "FALTA SEÇÃO ${n}"
done
```

Expected: nenhuma saída.

- [ ] **Step D: Confirmar que nenhum código foi alterado:**

```bash
git status --porcelain | grep -v '^?? \|\.md$' | grep -v '^A  .*\.md$' && echo "ERRO: código alterado"
```

Expected: nenhuma saída.

- [ ] **Step E: Commit:**

```bash
git add src/modules/<mod>/README.md
git commit -m "docs(<mod>): add module README

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

**Template obrigatório (copiar integralmente em cada README de módulo):**

```markdown
# Módulo: <Nome>

## 1. Propósito

Um ou dois parágrafos explicando o que o módulo resolve no domínio da plataforma
e seu contexto de negócio. Ser específico: não escrever "gerencia usuários" —
escrever "expõe queries e mutations para criar, atualizar e autenticar usuários;
aciona módulo `sms` para envio de código de verificação no cadastro".

## 2. Regras de Negócio

Lista enumerada de regras invariantes que o módulo garante. Cada item cita o
arquivo/linha onde está implementada.

1. <regra> (ver `<mod>.service.ts:<linha>`)
2. ...

Se não houver regra de negócio (módulo de infra), escrever "Não se aplica —
módulo de infraestrutura".

## 3. Entidades e Modelo de Dados

Tabela com campos Prisma (quando aplicável). Inclui diagrama Mermaid `erDiagram`
focado nas entidades deste módulo e suas conexões diretas. Linkar para
[`../../../docs/data-model.md`](../../../docs/data-model.md) para o ERD completo.

## 4. API GraphQL

### Queries

| Nome | Argumentos | Retorno | Auth | Descrição |
| --- | --- | --- | --- | --- |
| `<query>` | `<args>` | `<Type>` | `<Guards>` | <descrição> |

### Mutations

| Nome | Argumentos | Retorno | Auth | Descrição |
| --- | --- | --- | --- | --- |

### Subscriptions

(Se houver; senão "Não se aplica".)

### REST (se houver)

(Se houver controller, listar rotas.)

## 5. DTOs e Inputs

Uma subseção por DTO. Cada uma contém tabela com:

| Campo | Tipo | Validadores | Obrigatório | Observação |

## 6. Fluxos Principais

Passo-a-passo + diagrama `sequenceDiagram` Mermaid por fluxo crítico do módulo.
Exemplo de cabeçalho por fluxo: `### Fluxo: <nome>`.

## 7. Dependências

### Módulos internos importados
Lista (por `<mod>.module.ts > imports: [...]`).

### Módulos que consomem este
Resultado do grep reverso.

### Integrações externas
AWS SDK, PagSeguro, Twilio, GCP, Ollama, etc.

### Variáveis de ambiente

| Variável | Uso |

## 8. Autorização e Papéis

Guards aplicados (`@UseGuards(JwtAuthGuard, RolesGuard)`), roles permitidas por
operação (tabela). Decorators customizados usados (ex.: `@CurrentUser`).

## 9. Erros e Exceções

Tabela ou lista: erro lançado → condição → mensagem. Inclui `ConflictException`,
`NotFoundException`, `UnauthorizedException`, etc. capturados no código.

## 10. Pontos de Atenção / Manutenção

- Débitos técnicos evidentes.
- Limitações conhecidas.
- TODOs no código.
- Efeitos colaterais não óbvios.
- Performance (N+1, consultas pesadas).

## 11. Testes

Tabela:

| Arquivo | Cenários cobertos | Observações |
| `<mod>.service.spec.ts` | ... | |
| `<mod>.resolver.spec.ts` | ... | |

Resumir o que está coberto e o que claramente não está.
```

---

### Task 7: README do módulo `prisma`

**Por que agora?** Módulo de infra sem dependências — base do grafo.

**Files:**
- Create: `src/modules/prisma/README.md`
- Read: `src/modules/prisma/prisma.module.ts`, `src/modules/prisma/prisma.service.ts`

**Execução:** Aplicar o procedimento genérico (Steps A-E).

**Observações específicas:**
- Seção 2 "Regras de Negócio" = "Não se aplica — módulo de infraestrutura".
- Seção 3: listar os modelos gerados pelo Prisma (link para `docs/data-model.md`).
- Seção 4: "Não se aplica — sem GraphQL".
- Seção 6: documentar `onModuleInit` (conecta ao banco) e `enableShutdownHooks` se existir.
- Seção 7: levantar via `grep -rn "PrismaModule\|PrismaService" src --include="*.ts"` — praticamente todos os módulos de negócio.

Commit com mensagem: `docs(prisma): add module README`.

---

### Task 8: README do módulo `common`

**Files:**
- Create: `src/modules/common/README.md`
- Read: `src/modules/common/pagination.input.ts`, `src/modules/common/settings.js`, conteúdo de `src/modules/common/validators/`

**Execução:** Aplicar o procedimento genérico. Neste caso o módulo é uma pasta de utilitários (não é um NestModule), então o README pode usar um template adaptado:

```markdown
# Pasta utilitária: common

Não é um NestModule — agrupa utilitários compartilhados.

## Conteúdo

### pagination.input.ts
Input GraphQL reutilizável para paginação. Listar campos (skip, take, etc.) com tipos.

### settings.js
Arquivo JS isolado. Documentar conteúdo real.

### validators/
Validadores custom para class-validator. Listar cada um e o que valida.

## Quem usa

Grep reverso: `grep -rn "from.*common" src --include="*.ts"`.

## Pontos de atenção
Listar.
```

Para este README, **o template de 11 seções não se aplica** — é uma exceção explícita. Documentar a exceção no topo do README ("Este não é um NestModule; usa template simplificado").

Commit: `docs(common): add utilities README`.

---

### Task 9: README do módulo `roles`

**Files:**
- Create: `src/modules/roles/README.md`

**Execução:** Procedimento genérico com as 11 seções.

**Observações específicas:**
- Seção 2: roles são FK obrigatória em `User`; são seed-adas (verificar como — migration, endpoint de admin, ou manual).
- Seção 3: entidade `Role` (id Int autoincrement, name, users).
- Seção 4: provavelmente tem CRUD de roles (listar queries/mutations reais).
- Seção 7: importado por `UsersModule`, `AuthModule`.

Commit: `docs(roles): add module README`.

---

### Task 10: README do módulo `sms`

**Files:**
- Create: `src/modules/sms/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 3: "Não se aplica — módulo sem entidade própria".
- Seção 4: não expõe GraphQL (conferir em `app.module.ts` que está fora do `include`).
- Seção 6: documentar o fluxo de envio (provider: Twilio ou TeleSign — conferir pelas dependências e pelo service).
- Seção 7: variáveis de ambiente `TWILIO_*` / `TELESIGN_*`.

Commit: `docs(sms): add module README`.

---

## Fase 3 — Módulos de domínio central

### Task 11: README do módulo `addresses`

**Files:**
- Create: `src/modules/addresses/README.md`

**Execução:** Procedimento genérico com 11 seções.

**Observações específicas:**
- Seção 2: `Address` é 1:1 opcional com `User` (FK `userId @unique`). `onDelete: Cascade` — deletar User deleta Address.
- Seção 3: entidade `Address` (street, number, complement, district, city, state, cep, latitude, longitude).
- Seção 7: importado pelo `UsersModule` (provável). Conferir grep reverso.

Commit: `docs(addresses): add module README`.

---

### Task 12: README do módulo `users`

**Files:**
- Create: `src/modules/users/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: ciclo de vida do User (PENDING → ATIVO via código SMS). Regra de hash de senha (bcrypt).
- Seção 3: entidade `User` (referenciar `docs/data-model.md`).
- Seção 4: expõe queries/mutations — verificar se está no `include` do GraphQL (não está, pelo `app.module.ts`). Documentar como acessível apenas internamente.
- Seção 6: fluxo de cadastro com `sequenceDiagram` (User → Resolver → Service → Prisma + SMS).
- Seção 7: importa `PrismaModule`, `RolesModule`, `SmsModule`, `AddressesModule` (conferir).

Commit: `docs(users): add module README`.

---

### Task 13: README do módulo `auth`

**Files:**
- Create: `src/modules/auth/README.md`
- Read extra: `src/modules/auth/guards/`, `src/modules/auth/strategies/`, `src/modules/auth/decorators/`, `src/modules/auth/interfaces/`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: regras de login (email + password + bcrypt compare), JWT com `JWT_SECRET`, reset de senha via `resetPasswordToken`.
- Seção 4: `login`, `signIn`, `refresh`, `forgotPassword`, `resetPassword` (listar o que realmente existe).
- Seção 6: fluxo de login com `sequenceDiagram`.
- Seção 8: documentar `JwtAuthGuard`, `RolesGuard`, `@CurrentUser`, `@Roles` — este módulo é a fonte da verdade da autorização.
- Seção 7: variáveis `JWT_SECRET`, expiração, etc.

Commit: `docs(auth): add module README`.

---

## Fase 4 — Módulos de billing/assinatura

### Task 14: README do módulo `plans`

**Files:**
- Create: `src/modules/plans/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: `price` em centavos, `currency` default BRL, `isActive` = default true, soft-delete.
- Seção 3: `Plan` entidade.
- Seção 4: CRUD + listagem de planos ativos.
- Seção 7: importado por `SubscriptionsModule`, `PaymentsModule`, `PagSeguroModule` (conferir).

Commit: `docs(plans): add module README`.

---

### Task 15: README do módulo `subscription-status`

**Files:**
- Create: `src/modules/subscription-status/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: catálogo de estados — lista dos slugs usados no código.
- Seção 7: importado por `SubscriptionsModule`.

Commit: `docs(subscription-status): add module README`.

---

### Task 16: README do módulo `subscriptions`

**Files:**
- Create: `src/modules/subscriptions/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: um User pode ter múltiplas Subscriptions (schema permite — conferir se service restringe a 1 ativa por plano); `autoRenew`, `trialEnd`; `amount` em centavos.
- Seção 6: fluxo "criar assinatura" com `sequenceDiagram` cruzando PagSeguro e Payments.
- Seção 7: importa `PlansModule`, `PaymentsModule`, `PagSeguroModule`, `SubscriptionStatusModule`, `UsersModule` (conferir).

Commit: `docs(subscriptions): add module README`.

---

### Task 17: README do módulo `pag-seguro`

**Files:**
- Create: `src/modules/pag-seguro/README.md`
- Read extra: `src/modules/pag-seguro/pagseguro-api.ts`, `src/modules/pag-seguro/config/`, `src/modules/pag-seguro/enum/`, `src/modules/pag-seguro/pag-seguro.controller.ts`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: regras do PagSeguro (moeda BRL, métodos suportados, webhook).
- Seção 4: se houver webhook (controller) — documentar rota e payload esperado.
- Seção 6: fluxo de cobrança completo.
- Seção 7: variáveis `PAG_SEGURO_*` (token, sandbox/prod).

Commit: `docs(pag-seguro): add module README`.

---

### Task 18: README do módulo `payments`

**Files:**
- Create: `src/modules/payments/README.md`
- Read extra: `src/modules/payments/factory/`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: `Payment` sempre referencia `User`, `Plan`, `Subscription`; campo `paymentDetails` é Json (documentar estrutura esperada).
- Seção 4: listar pagamentos do usuário, criar pagamento.
- Seção 6: fluxo de confirmação (webhook PagSeguro → atualiza Payment + Subscription.status).
- Seção 7: depende de `PagSeguroModule`, `SubscriptionsModule`.

Commit: `docs(payments): add module README`.

---

## Fase 5 — Módulos de conteúdo

### Task 19: README do módulo `posts`

**Files:**
- Create: `src/modules/posts/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: gate "Ultimate" (se aplicável — verificar no service), soft-delete, `reportedPublication` flag.
- Seção 3: entidade `Post` (imageUrl array, videoUrl opcional).
- Seção 6: fluxo criar post com upload de mídia (chama `upload-medias`).
- Seção 7: importa `UploadMediasModule`, `UsersModule`, possivelmente `SubscriptionsModule`.

Commit: `docs(posts): add module README`.

---

### Task 20: README do módulo `comments`

**Files:**
- Create: `src/modules/comments/README.md`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: comentários aninhados via `parentId` (auto-relacionamento). Regra de profundidade (se houver limite).
- Seção 3: entidade `Comment`.
- Seção 7: importa `PostsModule`, `UsersModule`.

Commit: `docs(comments): add module README`.

---

### Task 21: README do módulo `complaints`

**Files:**
- Create: `src/modules/complaints/README.md`
- Read extra: `src/modules/complaints/enum/`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: Complaint alvo = Post OU Comment (ambos opcionais no schema); status inicia PENDING; `analysesComplaints` guarda saída de IA; `appraiser` = moderador humano.
- Seção 6: fluxo "abrir denúncia → análise IA → moderação humana" com `sequenceDiagram`.
- Seção 7: depende de `AssistantAiModule`, `PostsModule`, `CommentsModule`.

Commit: `docs(complaints): add module README`.

---

### Task 22: README do módulo `upload-medias`

**Files:**
- Create: `src/modules/upload-medias/README.md`
- Read extra: `src/modules/upload-medias/config/`, `src/modules/upload-medias/upload-medias.controller.ts`, existente `src/modules/upload-medias/README.md` (se já houver)

**Execução:** Procedimento genérico.

**Observações específicas:**
- Se existir README prévio, **ler antes** e substituir por um completo seguindo o template de 11 seções; não preservar conteúdo não verificável.
- Seção 4: documentar GraphQL (se expõe — está no `include`) e REST (controller).
- Seção 6: fluxo upload (multipart → validate → S3 putObject → persist URL).
- Seção 7: `AWS_*` env vars, `aws-sdk/client-s3`, `multer`, `graphql-upload`.

Commit: `docs(upload-medias): add module README`.

---

## Fase 6 — Módulos de integração e operação

### Task 23: README do módulo `gcp`

**Files:**
- Create: `src/modules/gcp/README.md`
- Read extra: `src/modules/gcp/quickstart.js`, `src/modules/gcp/package.json` (conferir por que tem um package.json próprio)

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 10: anotar o `package.json` dentro de `gcp/` — incomum para NestJS (pode indicar script isolado; documentar sem julgar).
- Seção 7: `@google-cloud/pubsub`, variáveis `GCP_*`.

Commit: `docs(gcp): add module README`.

---

### Task 24: README do módulo `assistant_ai`

**Files:**
- Create: `src/modules/assistant_ai/README.md`
- Read extra: `src/modules/n8n-agent/Assistente de analise de postagens.json`

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 2: este módulo analisa denúncias com LLM local (Ollama via LangChain).
- Seção 6: fluxo de análise + `sequenceDiagram`.
- Seção 7: `@langchain/*`, `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk`, variáveis de ambiente do LLM.
- **Subseção especial: "Workflow n8n-agent"** — documentar o arquivo JSON em
  `src/modules/n8n-agent/` (escopo, inputs, nodes). Texto final dessa subseção:

```markdown
### Integração n8n-agent

A pasta `src/modules/n8n-agent/` (paralela a este módulo) contém o arquivo
`Assistente de analise de postagens.json` — um workflow exportado do n8n.
Propósito: <resumo real do JSON>. Este arquivo não é executado pela aplicação
NestJS; é uma referência para a infra de automação externa.
```

Commit: `docs(assistant_ai): add module README with n8n-agent workflow note`.

---

### Task 25: README do módulo `reporting`

**Files:**
- Create: `src/modules/reporting/README.md`
- Read extra: `src/modules/reporting/reporting.service.controller.ts` (nome incomum — documentar)

**Execução:** Procedimento genérico.

**Observações específicas:**
- Seção 10: arquivo `reporting.service.controller.ts` tem nomenclatura dupla — anotar como ponto de atenção (possível débito: ou é service ou é controller, não ambos).
- Seção 4: módulo fora do `include` do GraphQL — documentar se expõe REST.

Commit: `docs(reporting): add module README`.

---

## Fase 7 — Pastas raiz de integração

### Task 26: README de `src/aws/`

**Files:**
- Create: `src/aws/README.md`
- Read: conteúdo completo de `src/aws/`

- [ ] **Step 1:** Ler a pasta.

```bash
find src/aws -type f
```

- [ ] **Step 2:** Escrever README adaptado (não é NestModule — template simplificado):

```markdown
# src/aws

Camada de integração com AWS SDK v3. Centraliza clients reutilizáveis
(S3, SQS, SNS, Secrets Manager, SSM).

## Conteúdo

Listar subpastas e arquivos reais com o papel de cada um.

## Clients expostos

Tabela:
| Serviço | Arquivo | Função |

## Variáveis de ambiente

| Variável | Uso |

## Quem usa

Resultado do grep reverso.

## Pontos de atenção
```

- [ ] **Step 3:** Commit: `docs(aws): add integration layer README`.

---

### Task 27: README de `src/llm-service/`

**Files:**
- Create: `src/llm-service/README.md`
- Read: conteúdo completo de `src/llm-service/`

**Execução:** igual à Task 26, adaptado para LLM.

```markdown
# src/llm-service

Wrapper sobre LangChain/LangGraph para chamadas a LLM local (Ollama) ou
Anthropic Claude SDK.

## Conteúdo
Listar arquivos reais.

## API exposta
Lista de funções/classes exportadas e o que retornam.

## Provedores suportados
- Ollama (local)
- Anthropic Claude (via `@anthropic-ai/sdk`)

## Variáveis de ambiente
| Variável | Uso |

## Quem usa
Grep reverso.
```

Commit: `docs(llm-service): add LLM wrapper README`.

---

## Fase 8 — Verificação final

### Task 28: Verificação geral + checkpoint

**Files:** nenhum novo. Só comandos de verificação.

- [ ] **Step 1: Contagem de arquivos gerados**

```bash
find docs -name "*.md" ! -path "*/superpowers/*" | sort
# Esperado: 6 arquivos
#   docs/README.md
#   docs/architecture.md
#   docs/business-rules.md
#   docs/conventions.md
#   docs/data-model.md
#   docs/infrastructure.md

find src -name "README.md" | sort
# Esperado: 21 arquivos
#   18 de módulos + common + aws + llm-service
```

- [ ] **Step 2: Verificar as 11 seções em todos os READMEs de módulo**

```bash
for f in src/modules/*/README.md; do
  [ "$f" = "src/modules/common/README.md" ] && continue   # exceção documentada
  for n in 1 2 3 4 5 6 7 8 9 10 11; do
    grep -q "^## ${n}\. " "$f" || echo "$f FALTA SEÇÃO ${n}"
  done
done
```

Expected: nenhuma saída.

- [ ] **Step 3: Confirmar que nenhum arquivo não-md foi alterado**

```bash
git diff --stat main...HEAD -- '*.ts' '*.js' '*.prisma' '*.tf' '*.json' '*.mjs' \
  'Dockerfile' 'Makefile' '.prettierrc' '.gitignore' '.gitattributes' 'ollama-entrypoint.sh' \
  '*.tfstate' '*.hcl'
```

Expected: vazio.

- [ ] **Step 4: Confirmar ausência de emojis**

```bash
# Busca caracteres fora da faixa ASCII comum (incluindo pt-BR). Emojis ficam em
# faixas específicas Unicode — conferência por inspeção manual dos .md criados.
grep -rP "[\x{1F300}-\x{1FAFF}]|[\x{2600}-\x{27BF}]" docs src --include="*.md" || echo "Sem emojis detectados."
```

Expected: "Sem emojis detectados." (o `|| echo` só dispara se não houver match).

- [ ] **Step 5: Invocar skill `superpowers:verification-before-completion`** para auditoria independente antes de encerrar.

- [ ] **Step 6: Commit final (se houver apenas metadados a commitar) e mensagem de conclusão no chat**

Nenhuma alteração pendente esperada — apenas verificar `git status` limpo e reportar ao usuário.

Depois, invocar `superpowers:finishing-a-development-branch` para decidir merge/PR.

---

## Resumo de commits esperados

Aproximadamente:
- 2 commits de spec (já feitos).
- 6 commits de docs transversais.
- 19 commits de READMEs de módulos/pastas.
- 1 commit final se necessário.

Total: ~28 commits na branch `docs/modules-documentation`.

## Critério de "pronto"

Plano concluído quando:
1. Todos os 27 arquivos markdown novos existem.
2. Todos os READMEs de módulo têm as 11 seções (exceto `common`, `aws`, `llm-service` — template simplificado explicado no próprio README).
3. Nenhum arquivo de código foi alterado.
4. Skill `verification-before-completion` aprovou a auditoria.
5. Usuário aprovou para passar ao `finishing-a-development-branch`.
