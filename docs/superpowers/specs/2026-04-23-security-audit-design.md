# Security Audit — Design Spec

**Goal:** Identificar e corrigir todas as vulnerabilidades de segurança da API Date Me Encontre Aqui, cobrindo autenticação, autorização, configuração de infraestrutura e vazamento de dados.

**Architecture:** Correção em 3 fases independentes — Crítico → Alto → Infra/Hardening. Cada fase entrega um PR funcional e testável sem depender das demais.

**Tech Stack:** NestJS 11, GraphQL (Apollo), Prisma, PostgreSQL, Redis (cache-manager), Passport JWT, Express

---

## Threat Model

**Superfície de ataque:**
- `POST /graphql` — endpoint principal, acessível por qualquer cliente
- `POST/GET /upload-medias` — upload de arquivos (REST, requer JWT)
- `GET/POST /public-key` — chave pública PagSeguro e webhook (REST, sem auth)
- `GET /uploads/*` — arquivos estáticos servidos diretamente

**Atores de ameaça:**
- **Externo não autenticado** — acessa endpoints públicos, tenta criar contas/pedidos/assinaturas sem login
- **USER autenticado mal-intencionado** — tenta escalar privilégios, editar dados de outros usuários, ativar contas de terceiros
- **Atacante com schema** — usa introspection para mapear toda a API antes de atacar

---

## Inventário de Vulnerabilidades

| ID | Severidade | Vulnerabilidade | OWASP | Fase |
|----|-----------|-----------------|-------|------|
| CRIT-01 | 🔴 Crítico | IDOR em `updateUser` — lógica de permissão invertida | A01 | 1 |
| CRIT-02 | 🔴 Crítico | Escalada de role via campo `roleId` em `UpdateUserInput` | A01 | 1 |
| CRIT-03 | 🔴 Crítico | PagSeguro resolver sem `@UseGuards` — operações financeiras abertas | A01 | 1 |
| CRIT-04 | 🔴 Crítico | `createSubscription` sem autenticação | A01 | 1 |
| CRIT-05 | 🔴 Crítico | `verificationCode` público sem rate limit — brute-force em 4 dígitos | A07 | 1 |
| CRIT-06 | 🔴 Crítico | `introspection: true` e `playground: true` incondicionais | A05 | 1 |
| CRIT-07 | 🔴 Crítico | Queries de posts/comments sem guard — conteúdo adulto público | A01 | 1 |
| HIGH-01 | 🟠 Alto | Login não verifica `status` — PENDING/BLOCKED recebem JWT | A07 | 2 |
| HIGH-02 | 🟠 Alto | Logout remove só refresh token — access token continua válido | A07 | 2 |
| HIGH-03 | 🟠 Alto | Fallback secret hardcoded: `'fallback-secret-key'` | A02 | 2 |
| HIGH-04 | 🟠 Alto | `MOCK_PRISMA=true` desabilita toda autenticação silenciosamente | A05 | 2 |
| HIGH-05 | 🟠 Alto | `JwtAuthGuard` bypassa auth por nome de campo hardcoded (`CreateUser`) | A07 | 2 |
| HIGH-06 | 🟠 Alto | `refresh()` assina novo token sem `secret` explícito | A02 | 2 |
| HIGH-07 | 🟠 Alto | `AuthService` acessa `usersService['prisma']` diretamente | A04 | 2 |
| INFRA-01 | 🟡 Médio | Sem rate limiting em nenhum endpoint | A07 | 3 |
| INFRA-02 | 🟡 Médio | Sem Helmet — headers de segurança ausentes | A05 | 3 |
| INFRA-03 | 🟡 Médio | CORS não configurado — aceita qualquer origem | A05 | 3 |
| INFRA-04 | 🟡 Médio | GraphQL sem depth/complexity limits — DoS via queries aninhadas | A05 | 3 |
| INFRA-05 | 🟡 Médio | `console.log` em produção com dados sensíveis (pagamento, webhook, CPF) | A09 | 3 |
| INFRA-06 | 🟡 Médio | `forbidNonWhitelisted: false` — campos extras ignorados silenciosamente | A05 | 3 |
| INFRA-07 | 🟡 Médio | Uploads servidos como estáticos sem autenticação | A01 | 3 |
| INFRA-08 | 🟡 Médio | Sem limite de tamanho no body GraphQL | A05 | 3 |
| INFRA-09 | 🟡 Médio | Stack traces completos expostos em respostas de erro em produção | A09 | 3 |

---

## Fase 1 — Críticos

### CRIT-01 — IDOR em `updateUser`

**Arquivo:** `src/modules/users/users.service.ts:187`

**Problema:**
```typescript
if (user.id !== me.id && me.roleId === 1) {
  throw new Error("You do not have permission to update user!")
}
```
A condição só bloqueia SUPER_ADMIN de editar outros. Um USER (roleId=3) passa livremente e pode alterar `fullName`, `email`, `password` de qualquer outro usuário.

**Correção:**
```typescript
const isAdmin = me.roleId === RoleId.SUPER_ADMIN || me.roleId === RoleId.ADMIN;
if (user.id !== me.id && !isAdmin) {
  throw new ForbiddenException('You do not have permission to update this user');
}
```
Aplicar mesma correção ao `softDelete` (mesma classe de bug com `me.roleId === 3`).

---

### CRIT-02 — Escalada de role via `UpdateUserInput`

**Arquivo:** `src/modules/users/dto/update-user.input.ts`, `src/modules/users/users.service.ts`

**Problema:** `UpdateUserInput` expõe `roleId`. Um USER pode chamar `updateUser` com `roleId: "SUPER_ADMIN"` e se tornar administrador.

**Correção:** No service, ignorar `roleId` do input se o usuário autenticado não for ADMIN ou SUPER_ADMIN:
```typescript
if (!isAdmin && updateData.roleId !== undefined) {
  delete updateData.roleId;
}
```

---

### CRIT-03 — PagSeguro resolver sem autenticação

**Arquivo:** `src/modules/pag-seguro/pag-seguro.resolver.ts`

**Problema:** `createAndPaymentOrder`, `consultOrderById`, `payOrderById` não têm `@UseGuards`. Qualquer pessoa pode criar e consultar pedidos financeiros.

**Correção:**
```typescript
@UseGuards(GqlAuthGuard)
@Mutation(() => GraphQLJSON)
createAndPaymentOrder(@CurrentUser() me, @Args('create') create: CreateOrderInput) { ... }
```
Adicionar guard em todas as 3 operações. `consultOrderById` deve validar que o pedido pertence ao user autenticado.

---

### CRIT-04 — `createSubscription` sem autenticação

**Arquivo:** `src/modules/subscriptions/subscriptions.resolver.ts`

**Problema:** Mutation `createSubscription` sem guard. Qualquer pessoa pode criar assinaturas para qualquer `userId`.

**Correção:**
```typescript
@UseGuards(GqlAuthGuard)
@Mutation(() => Subscription)
createSubscription(@CurrentUser() me, @Args('createSubscriptionInput') input: CreateSubscriptionInput) {
  input.userId = me.id; // nunca aceitar userId do input
  return this.subscriptionsService.create(input);
}
```

---

### CRIT-05 — `verificationCode` brute-forceable

**Arquivos:** `src/modules/users/users.resolver.ts`, `src/modules/users/users.service.ts`, `prisma/schema.prisma`

**Problema:**
- Código de 4 dígitos (`Math.random` — 9.000 combinações)
- Sem expiração no código
- Mutação pública sem rate limiting

**Correção:**
1. Aumentar para 6 dígitos (900.000 combinações): `Math.floor(100000 + Math.random() * 900000)`
2. Adicionar campo `verificationCodeExpiresAt DateTime?` no schema Prisma — TTL de 15 minutos
3. Rate limiting via Redis: máx 5 tentativas por `userId` em 15 min, lockout de 30 min após exceder
4. No service: rejeitar código se `verificationCodeExpiresAt < now`

---

### CRIT-06 — Introspection e Playground incondicionais

**Arquivo:** `src/app.module.ts`

**Problema:** Schema completo exposto em produção via `introspection: true` e `playground: true`.

**Correção:**
```typescript
introspection: process.env.ENV !== 'production',
playground: process.env.ENV !== 'production',
```

---

### CRIT-07 — Posts e Comments sem guard explícito

**Arquivos:** `src/modules/posts/posts.resolver.ts`, `src/modules/comments/comments.resolver.ts`

**Problema:** Queries `posts`, `post(id)`, `commentsByPost`, `comment(id)` sem `@UseGuards`. Em plataforma adulta, conteúdo deve ser protegido.

**Correção:** Adicionar `@UseGuards(GqlAuthGuard)` nas queries de leitura. Se a decisão de produto for manter público, marcar explicitamente com `@Public()` para deixar a intenção clara no código.

---

## Fase 2 — Altos

### HIGH-01 — Login não verifica status

**Arquivo:** `src/modules/auth/auth.service.ts:validateUser`

**Problema:** PENDING, INACTIVE e BLOCKED recebem JWT válido.

**Correção:**
```typescript
if (user.status !== StatusUser.ACTIVE) {
  return null; // retorna null, não exception — evita user enumeration
}
```

---

### HIGH-02 — Logout não revoga access token

**Arquivo:** `src/modules/auth/auth.service.ts:logout`, `src/modules/auth/auth.resolver.ts`

**Problema:** Só remove refresh token. Access token permanece válido até expirar.

**Correção:**
1. Resolver extrai token do header e passa ao service
2. Service chama `revokeToken(accessToken, ttlRestante)` — já existe no Redis
3. `JwtStrategy.validate()` já verifica `isTokenRevoked` — funciona sem mudança

---

### HIGH-03 — Fallback secret hardcoded

**Arquivo:** `src/modules/auth/strategies/jwt.strategy.ts:22`, `src/modules/auth/auth.module.ts:21`

**Problema:** `|| 'fallback-secret-key'` permite forjar tokens se `JWT_SECRET` não estiver definido.

**Correção:**
```typescript
const jwtSecret = configService.get<string>('JWT_SECRET');
if (!jwtSecret) throw new Error('JWT_SECRET env var is required — refusing to start');
```
Aplicar o mesmo para `JWT_REFRESH_SECRET`. Remover acesso direto via `process.env.JWT_SECRET` no `auth.module.ts`.

---

### HIGH-04 — MOCK_PRISMA bypass em produção

**Arquivos:** `jwt-auth.guard.ts`, `jwt-rest-auth.guard.ts`, `jwt.strategy.ts`

**Problema:** `MOCK_PRISMA=true` desabilita toda autenticação silenciosamente.

**Correção:**
1. Remover `MOCK_PRISMA` check de `JwtRestAuthGuard` e `JwtAuthGuard` completamente
2. Em `JwtStrategy.validate()`: manter retorno fictício apenas para `--generate-only` (geração de schema), remover `MOCK_PRISMA`
3. Adicionar guard de inicialização em `main.ts`:
```typescript
if (process.env.NODE_ENV === 'production' && process.env.MOCK_PRISMA === 'true') {
  throw new Error('MOCK_PRISMA cannot be enabled in production');
}
```

---

### HIGH-05 — `JwtAuthGuard` bypassa por nome de campo

**Arquivo:** `src/modules/auth/guards/jwt-auth.guard.ts:30`

**Problema:** `if (fieldName === 'CreateUser') return true` — frágil e desnecessário.

**Correção:** Remover esse bloco. O `@Public()` decorator no resolver já garante o bypass correto.

---

### HIGH-06 — `refresh()` assina token sem secret

**Arquivo:** `src/modules/auth/auth.service.ts:refresh`

**Correção:**
```typescript
const newAccessToken = this.jwtService.sign(
  { sub: payload.sub, email: payload.email, role: payload.role },
  {
    expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    secret: this.configService.get<string>('JWT_SECRET'),
  },
);
```

---

### HIGH-07 — AuthService acessa Prisma via `['prisma']`

**Arquivos:** `src/modules/auth/auth.service.ts`, `src/modules/users/users.service.ts`

**Problema:** Acesso privado quebra encapsulamento e impede testes. `findUniqueOrThrow` vaza detalhes do Prisma se email não existir.

**Correção:**
1. Adicionar `findUserByEmail(email: string): Promise<User | null>` no `UsersService`
2. Substituir o acesso direto em `AuthService.validateUser()` por `this.usersService.findUserByEmail(email)`
3. Tratar `PrismaClientKnownRequestError` no novo método, retornando `null`

---

## Fase 3 — Infra / Hardening

### INFRA-01 — Rate Limiting

**Nova dependência:** `@nestjs/throttler`

**Configuração global no `AppModule`:**
```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])
```

**Limites por endpoint:**

| Endpoint | TTL | Limit |
|----------|-----|-------|
| `login` | 60s | 5 por IP |
| `CreateUser` | 3600s | 3 por IP |
| Upload REST | 60s | 20 por user |
| GraphQL geral | 60s | 100 por IP |

---

### INFRA-02 — Helmet

**Arquivo:** `src/main.ts`

```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

### INFRA-03 — CORS

**Arquivo:** `src/main.ts`

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST'],
});
```

Nova variável de ambiente: `ALLOWED_ORIGINS` (comma-separated).

---

### INFRA-04 — GraphQL depth e complexity

**Novas dependências:** `graphql-depth-limit`, `graphql-query-complexity`

```typescript
GraphQLModule.forRoot({
  validationRules: [
    depthLimit(7),
    createComplexityRule({ maximumComplexity: 1000 }),
  ],
})
```

---

### INFRA-05 — Remover console.log com dados sensíveis

**Arquivos a limpar:**

| Arquivo | Linha(s) | Dado vazado |
|---------|---------|-------------|
| `users/users.service.ts` | 185 | userId em update |
| `pag-seguro/pag-seguro.service.ts` | 76, 107, 126, 176-178 | Dados de pedido, assinatura webhook |
| `payments/payments.service.ts` | 23, 28, 40 | Dados completos de pagamento |
| `complaints/complaints.service.ts` | 22, 30, 52 | Denúncia + reporterId |
| `addresses/addresses.service.ts` | 20 | Objeto user completo |
| `sms/sms.service.ts` | 33 | Confirmação SMS enviado |

**Substituir por** `Logger` do NestJS com nível `debug` (desabilitado em produção via `LOG_LEVEL=error`).

---

### INFRA-06 — `forbidNonWhitelisted: true`

**Arquivo:** `src/main.ts`

```typescript
forbidNonWhitelisted: true, // era false
```

---

### INFRA-07 — Uploads sem autenticação

**Arquivo:** `src/main.ts`, novo `src/modules/upload-medias/media-serve.controller.ts`

**Problema:** `app.useStaticAssets(...)` serve todos os arquivos sem auth.

**Correção:**
1. Remover `useStaticAssets` do `main.ts`
2. Criar `GET /media/:mediaId` protegido por `JwtRestAuthGuard`
3. Service verifica se o `mediaId` pertence ao user autenticado antes de servir

---

### INFRA-08 — Limite de body GraphQL

**Arquivo:** `src/main.ts`

```typescript
import * as express from 'express';
app.use('/graphql', express.json({ limit: '100kb' }));
```

---

### INFRA-09 — Stack traces em produção

**Arquivo:** `src/app.module.ts` — configuração do Apollo

```typescript
formatError: (error) => {
  if (process.env.ENV === 'production') {
    return { message: error.message, extensions: { code: error.extensions?.code } };
  }
  return error;
},
```

---

## Novas dependências

| Pacote | Fase | Uso |
|--------|------|-----|
| `@nestjs/throttler` | 3 | Rate limiting global |
| `helmet` | 3 | HTTP security headers |
| `graphql-depth-limit` | 3 | Limitar profundidade de queries |
| `graphql-query-complexity` | 3 | Limitar complexidade de queries |

## Novas variáveis de ambiente

| Variável | Fase | Descrição | Exemplo |
|----------|------|-----------|---------|
| `ALLOWED_ORIGINS` | 3 | Origins permitidas no CORS | `https://dateme.app,https://admin.dateme.app` |
| `LOG_LEVEL` | 3 | Nível de log | `error` (prod), `debug` (dev) |

## Impacto por fase

| Fase | Arquivos modificados | Migration Prisma | Testes novos |
|------|---------------------|-----------------|--------------|
| 1 | 10 | 1 (`verificationCodeExpiresAt`) | 12 |
| 2 | 7 | 0 | 9 |
| 3 | 10 | 0 | 8 |
