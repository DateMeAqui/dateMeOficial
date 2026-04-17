# Módulo `prisma`

## 1. Propósito

Módulo de infraestrutura responsável por expor o cliente Prisma à aplicação NestJS. Declarado como `@Global()` em [`./prisma.module.ts`](./prisma.module.ts), registra o provider [`PrismaService`](./prisma.service.ts) e o exporta para que qualquer módulo consumidor possa injetar o cliente sem precisar re-importar `PrismaModule`.

O `PrismaService` estende `PrismaClient` (gerado a partir de [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma)) e implementa os lifecycle hooks do NestJS para gerenciar a conexão com o PostgreSQL.

## 2. Regras de Negócio

Não se aplica — módulo de infraestrutura.

## 3. Entidades e Modelo de Dados

O `PrismaService` herda de `PrismaClient` e, portanto, expõe todos os models declarados em [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma). Os 10 models atualmente disponíveis são:

1. `User` (tabela `users`)
2. `Address` (tabela `addresses`)
3. `Role` (tabela `roles`)
4. `Plan` (tabela `plans`)
5. `Subscription` (tabela `subscriptions`)
6. `SubscriptionStatus` (tabela `subscription_status`)
7. `Payment` (tabela `payments`)
8. `Post` (tabela `posts`)
9. `Comment` (tabela `comments`)
10. `Complaint` (tabela `complaints`)

A descrição detalhada dos campos, relacionamentos e convenções de nomenclatura está em [`../../../docs/data-model.md`](../../../docs/data-model.md).

## 4. API GraphQL

Não se aplica.

## 5. DTOs e Inputs

Não se aplica.

## 6. Fluxos Principais

O [`PrismaService`](./prisma.service.ts) implementa dois hooks do ciclo de vida do NestJS:

- **`onModuleInit()`** — chamado pelo Nest quando o módulo é inicializado. Executa `await this.$connect()`, abrindo a conexão com o banco definido em `DATABASE_URL`.
- **`onModuleDestroy(signal?: string)`** — chamado quando o módulo é destruído. Executa `await this.$disconnect()`, fechando a conexão ativa.

O service não implementa `enableShutdownHooks` nem qualquer hook adicional do Prisma; o desligamento é conduzido exclusivamente via `onModuleDestroy`.

## 7. Dependências

**Módulos que consomem `PrismaService` ou importam `PrismaModule`:**

- [`../../app.module.ts`](../../app.module.ts) — importa `PrismaModule` no array `imports` (o `@Global()` propaga para toda a aplicação).
- [`../users/users.module.ts`](../users/users.module.ts) — importa `PrismaModule` explicitamente.
- [`../users/users.service.ts`](../users/users.service.ts) — injeta `PrismaService`.
- [`../addresses/addresses.service.ts`](../addresses/addresses.service.ts) — injeta `PrismaService`.
- [`../plans/plans.service.ts`](../plans/plans.service.ts) — injeta `PrismaService`.
- [`../subscriptions/subscriptions.service.ts`](../subscriptions/subscriptions.service.ts) — injeta `PrismaService`.
- [`../subscription-status/subscription-status.service.ts`](../subscription-status/subscription-status.service.ts) — injeta `PrismaService`.
- [`../payments/payments.service.ts`](../payments/payments.service.ts) — injeta `PrismaService`.
- [`../posts/posts.service.ts`](../posts/posts.service.ts) — injeta `PrismaService`.
- [`../complaints/complaints.service.ts`](../complaints/complaints.service.ts) — injeta `PrismaService`.
- [`../reporting/reporting.service.ts`](../reporting/reporting.service.ts) — injeta `PrismaService`.
- [`../users/users.service.spec.ts`](../users/users.service.spec.ts) e [`../users/users.resolver.spec.ts`](../users/users.resolver.spec.ts) — usam `PrismaService` mockado em testes.

**Integrações externas:** nenhuma externa ao projeto; toda a comunicação ocorre com o PostgreSQL configurado via Prisma.

**Variáveis de ambiente:**

- `DATABASE_URL` — URL de conexão com o PostgreSQL, consumida pelo `datasource db` de [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma).

## 8. Autorização e Papéis

Não se aplica.

## 9. Erros e Exceções

O [`PrismaService`](./prisma.service.ts) não implementa tratamento customizado de erros. Falhas propagadas pelo cliente Prisma (por exemplo, `PrismaClientInitializationError` durante `$connect()` em caso de `DATABASE_URL` inválida ou banco indisponível, e `PrismaClientKnownRequestError` em violações de constraint durante operações) são lançadas diretamente ao consumidor ou ao processo de bootstrap do Nest.

## 10. Pontos de Atenção / Manutenção

- **`@Global()`** — como o módulo é marcado como global em [`./prisma.module.ts`](./prisma.module.ts), o `PrismaService` fica disponível em todo o container sem re-importação. Isso simplifica o uso, mas deve ser considerado em cenários de testes isolados — vários módulos consumidores declaram `PrismaModule` também nos próprios `imports` (ver [`../users/users.module.ts`](../users/users.module.ts)) como redundância ou para facilitar testes unitários.
- **`MOCK_PRISMA`** — há uma variável de ambiente `MOCK_PRISMA` que **não é consumida** por este módulo, mas altera o comportamento de outros fluxos. Em [`../auth/guards/jwt-auth.guard.ts`](../auth/guards/jwt-auth.guard.ts) e em [`../auth/strategies/jwt.strategy.ts`](../auth/strategies/jwt.strategy.ts), quando `process.env.MOCK_PRISMA === 'true'` (ou o processo roda com `--generate-only`), a autenticação JWT é ignorada. O uso previsto é permitir `yarn generate-only`/geração de schema sem subir banco; a documentação oficial em [`../../../docs/infrastructure.md`](../../../docs/infrastructure.md) descreve a flag como "Flag para alternar para um Prisma mockado em testes/locais.". Este módulo **não** faz mock automático do `PrismaClient` quando a flag está ligada; a flag apenas desliga guardas.
- **Lifecycle sem `enableShutdownHooks`** — o NestJS tem uma recomendação clássica (`prismaService.enableShutdownHooks(app)`) para disparar `beforeExit`. O service atual confia somente em `onModuleDestroy`. Em cenários de SIGTERM/SIGINT que não disparam o fluxo padrão do Nest, conexões podem não ser fechadas adequadamente.
- **Parâmetro `signal` em `onModuleDestroy`** — o parâmetro `signal?: string` está declarado, mas não é usado dentro do método.
- **Sem configuração customizada do `PrismaClient`** — o `super()` implícito é usado; não há passagem de `log`, `errorFormat` ou `datasources`. Ajustes de logging ou multi-tenancy exigiriam alteração do service.

## 11. Testes

Não há testes unitários dedicados ao próprio `PrismaService`. O service é utilizado como dependência mockada em specs de outros módulos (por exemplo, [`../users/users.service.spec.ts`](../users/users.service.spec.ts) e [`../users/users.resolver.spec.ts`](../users/users.resolver.spec.ts)), onde é fornecido via `useValue` com `jest.Mocked<PrismaService>`.
