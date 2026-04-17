# Convenções do projeto

Este documento reúne os padrões de código, estrutura de módulos, validação, autorização, testes, formatação e fluxo de commits observados no repositório.

Referências cruzadas:

- Visão geral de camadas e dependências: [architecture.md](./architecture.md)
- Modelo de dados: [data-model.md](./data-model.md)
- Regras transversais de negócio: [business-rules.md](./business-rules.md)

## 1. Estrutura padrão de um módulo NestJS

O projeto segue o layout do NestJS, com `sourceRoot` apontado para `src/modules` (ver [../nest-cli.json](../nest-cli.json)). Cada módulo funcional vive em `src/modules/<nome>/` e segue uma árvore comum, exemplificada por `src/modules/users/`:

```
src/modules/<mod>/
  <mod>.module.ts          # registra providers, imports e exports
  <mod>.resolver.ts        # GraphQL resolver (ou <mod>.controller.ts para REST)
  <mod>.service.ts         # lógica de domínio e acesso ao Prisma
  <mod>.resolver.spec.ts   # testes unitários do resolver
  <mod>.service.spec.ts    # testes unitários do service
  dto/                     # *.input.ts (InputType) e *.dto.ts (ObjectType)
  entities/                # <entidade>.entity.ts mapeando o modelo Prisma para GraphQL
  enums/                   # enums registrados com registerEnumType
```

Observações a partir de `src/modules/users/`:

- `users.module.ts` declara `providers: [UsersResolver, UsersService, ...]` e usa `exports: [UsersService]` para permitir reuso em outros módulos.
- Dependências transversais (ex.: `PrismaModule`) são importadas via `imports`.
- Utilitários compartilhados podem ser registrados como providers do próprio módulo (ex.: `CalculateDateBrazilNow`).

Nem todo módulo segue exatamente a mesma árvore: o módulo `auth` (em `src/modules/auth/`) inclui pastas adicionais `guards/`, `decorators/`, `strategies/` e `interfaces/`, específicas do domínio de autenticação.

## 2. GraphQL code-first

- A aplicação usa GraphQL code-first via `@nestjs/graphql` e `@nestjs/apollo` (ver `src/app.module.ts`).
- O schema é gerado automaticamente a partir dos decoradores (`@ObjectType`, `@InputType`, `@Field`, `@Resolver`, `@Query`, `@Mutation`, `registerEnumType`).
- Arquivo gerado: `src/schema.gql`. Configurado em `GraphQLModule.forRoot` com:
  - `driver: ApolloDriver`
  - `autoSchemaFile: join(process.cwd(), 'src/schema.gql')`
  - `introspection: true`, `playground: true`
- `src/schema.gql` NAO deve ser editado manualmente. Ele é reconstruído a cada boot da aplicação a partir dos decoradores.
- O campo `include` do `GraphQLModule` restringe quais módulos participam do schema gerado. Módulos novos que exponham queries ou mutations devem ser adicionados a essa lista.

## 3. Validação de entradas

- DTOs de entrada usam `class-validator` e `class-transformer` (dependências declaradas em `package.json`).
- Exemplo em `src/modules/common/pagination.input.ts`, que combina `@Field` do GraphQL com `@IsOptional` e `@IsPositive` do `class-validator`.
- O `ValidationPipe` está registrado globalmente em `src/main.ts`:

  ```ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  ```

- `whitelist: true` remove automaticamente campos não decorados; `transform: true` aplica conversões de tipo (ex.: string -> number) com base nas anotações.
- Convenção decorrente: todo DTO de entrada deve decorar seus campos com validadores; confiar em `whitelist` para descartar chaves extras.

## 4. Autorização (JWT e roles)

Todos os artefatos vivem em [../src/modules/auth/](../src/modules/auth/):

- `src/modules/auth/guards/jwt-auth.guard.ts` - `JwtAuthGuard` estende `AuthGuard('jwt')` e trata rotas marcadas como `@Public()`. Além disso, ignora autenticação quando o processo roda com `--generate-only` ou com `MOCK_PRISMA=true`, e libera explicitamente a mutation `CreateUser`.
- `src/modules/auth/guards/qgl-auth.guard.ts` - `GqlAuthGuard` é a variante usada nos resolvers GraphQL; converte o `ExecutionContext` via `GqlExecutionContext` antes de delegar à estratégia JWT. Os resolvers aplicam-no com `@UseGuards(GqlAuthGuard, RolesGuard)`.
- `src/modules/auth/guards/roles.guard.ts` - `RolesGuard` lê a metadata `ROLES_KEY` e compara com `req.user.role` (string) ou `req.user.role.name` (objeto). Lança `ForbiddenException` quando o usuário não tem a role exigida.
- `src/modules/auth/decorators/roles.decorator.ts` - `@Roles(...roles: string[])` atribui metadados lidos pelo `RolesGuard`. Valores usados nos resolvers: `'ADMIN'`, `'SUPER_ADMIN'`, `'USER'`.
- `src/modules/auth/decorators/current-user.decorator.ts` - `@CurrentUser()` é um `createParamDecorator` que retorna `req.user` a partir do contexto GraphQL.
- `src/modules/auth/guards/public.decorator.ts` - `@Public()` seta `IS_PUBLIC_KEY=true` e é reconhecido pelo `JwtAuthGuard`.

Padrão de uso em resolvers (ver `src/modules/users/users.resolver.ts`):

```ts
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'USER')
@Mutation(() => User, { name: 'updateUser' })
updateUser(@Args(...) ..., @CurrentUser() me) { ... }
```

> ⚠️ **A confirmar:** o `JwtAuthGuard` não está registrado como `APP_GUARD` em `src/app.module.ts`; a autenticação parece ser aplicada por resolver via `@UseGuards`. Validar se há registro global em algum módulo auxiliar.

## 5. Paginação

Input padrão: [../src/modules/common/pagination.input.ts](../src/modules/common/pagination.input.ts).

```ts
@InputType('PaginationInput')
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1, nullable: true })
  @IsOptional()
  @IsPositive()
  page?: number;

  @Field(() => Int, { defaultValue: 10, nullable: true })
  @IsOptional()
  @IsPositive()
  limit?: number;
}
```

Campos:

- `page` (Int, opcional, default `1`) - número da página requisitada, deve ser positivo.
- `limit` (Int, opcional, default `10`) - tamanho da página, deve ser positivo.

Convenção de uso no service (ver `UsersService.findAllUsersPagination`):

- `skip = (page - 1) * limit`
- `take = limit`
- Resposta inclui `users`, `total`, `page`, `limit`, `totalPages` (via tipo `UsersWithPagination`).

## 6. Prisma

- Cliente único `PrismaService` definido em `src/modules/prisma/prisma.service.ts`, estendendo `PrismaClient` e implementando `OnModuleInit` / `OnModuleDestroy` para `$connect` e `$disconnect`.
- Registrado por `PrismaModule` (`src/modules/prisma/prisma.module.ts`) com `@Global()`, de modo que `PrismaService` fica disponível em todo o grafo de DI sem necessidade de reimportar.
- Cada service injeta `PrismaService` no construtor (ex.: `UsersService`).
- Soft-delete é manual: convenção observada em `UsersService`:
  - `softDelete()` seta `deletedAt` (com ajuste de fuso horário brasileiro) e muda `status` para `INACTIVE`.
  - Consultas filtram `where: { deletedAt: null }` para ocultar registros marcados como removidos.
  - Um `@Cron('0 0 0 * * *')` em `deletingUserOlderThan30Days` remove definitivamente usuários cujo `deletedAt` ultrapassou 30 dias.

> ⚠️ **A confirmar:** o padrão de soft-delete (uso de `deletedAt` e filtro em consultas) foi verificado em `UsersService`. Em outros módulos pode existir divergência; consultar o README específico de cada módulo.

## 7. Lint e formatação

### ESLint

- Configuração em [../eslint.config.mjs](../eslint.config.mjs) (flat config).
- Extende:
  - `eslint.configs.recommended`
  - `tseslint.configs.recommendedTypeChecked`
  - `eslint-plugin-prettier/recommended`
- Regras customizadas:
  - `@typescript-eslint/no-explicit-any: off`
  - `@typescript-eslint/no-floating-promises: warn`
  - `@typescript-eslint/no-unsafe-argument: warn`
- Globals incluem `node` e `jest`. `sourceType: 'commonjs'`.

### Prettier

- Configuração em [../.prettierrc](../.prettierrc):
  - `singleQuote: true`
  - `trailingComma: 'all'`

### Comandos

- `npm run lint` - executa `eslint "{src,apps,libs,test}/**/*.ts" --fix`.
- `npm run format` - executa `prettier --write "src/**/*.ts" "test/**/*.ts"`.

## 8. Testes

### Jest (unitários)

Configuração embutida em [../package.json](../package.json) (`"jest": { ... }`):

- `rootDir: "src"`
- `testRegex: ".*\\.spec\\.ts$"`
- `transform`: `ts-jest` para `.ts` e `.js`.
- `collectCoverageFrom: ["**/*.(t|j)s"]`
- `coverageDirectory: "../coverage"`
- `testEnvironment: "node"`

Arquivos de teste seguem a convenção `<arquivo>.spec.ts` ao lado do arquivo testado (ex.: `users.service.spec.ts`).

### Jest (e2e)

- Configuração em [../test/jest-e2e.json](../test/jest-e2e.json):
  - `rootDir: "."`
  - `testRegex: ".e2e-spec.ts$"`
- Testes e2e ficam na pasta `test/` (ex.: `test/app.e2e-spec.ts`).

### Comandos

- `npm test` - `jest` (unitários).
- `npm run test:watch` - `jest --watch`.
- `npm run test:cov` - `jest --coverage`, saída em `coverage/`.
- `npm run test:debug` - executa Jest com `--inspect-brk` e `--runInBand`.
- `npm run test:e2e` - `jest --config ./test/jest-e2e.json`.

## 9. Commits

### Formato observado

Ao inspecionar `git log` na branch `docs/modules-documentation`, os commits recentes adotam o padrão [Conventional Commits](https://www.conventionalcommits.org/) com escopo:

```
docs(business-rules): document cross-module invariants
docs(architecture): add C4 container diagram and layer description
docs(data-model): add full ER diagram and entity tables
docs: add implementation plan for project documentation
```

Os dois primeiros commits do repositório são livres (`add project files`, `first commit`).

### Convenção adotada neste esforço de documentação

- Formato: `docs(<escopo>): <descrição curta em inglês, imperativo>`.
- `<escopo>` costuma ser o nome do artefato de documentação (`architecture`, `data-model`, `business-rules`, `conventions`, `<módulo>` etc.).
- Rodapé `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` em commits gerados com auxílio do agente.

> ⚠️ **A confirmar:** não há arquivo `COMMITLINT`, `commitlint.config.*` nem hook configurado para validar mensagens; a convenção é observada, não imposta automaticamente.

## 10. Manutenção da documentação

Regra de ouro: toda alteração num módulo (`src/modules/<mod>/**`) deve vir acompanhada da atualização do `README.md` correspondente do módulo (quando existir em `docs/modules/<mod>/README.md`) ou do documento transversal afetado em `docs/`.

Checklist recomendado ao abrir um PR que toca código:

- [ ] Atualizei o `README.md` do módulo quando mudei contrato público (resolvers, DTOs, eventos).
- [ ] Atualizei [data-model.md](./data-model.md) se alterei o schema Prisma ou relações.
- [ ] Atualizei [business-rules.md](./business-rules.md) se alterei uma regra transversal.
- [ ] Atualizei este documento se mudei padrão de código, lint, formatação ou testes.
- [ ] Rodei `npm run lint`, `npm run format` e `npm test` antes de commitar.

> ⚠️ **A confirmar:** a estrutura `docs/modules/<mod>/README.md` está sendo criada ao longo deste esforço de documentação; a existência de cada README depende do avanço das tasks correspondentes.
