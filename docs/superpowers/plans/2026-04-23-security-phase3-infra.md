# Security Phase 3 — Infra / Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar hardening de infraestrutura: rate limiting, headers de segurança, CORS, limites de queries GraphQL, remoção de logs sensíveis, e endpoint autenticado para servir uploads.

**Architecture:** Mudanças de configuração global (`main.ts`, `app.module.ts`) seguidas de limpeza de logs por módulo. O endpoint de mídia autenticado é a única adição estrutural nova.

**Tech Stack:** NestJS 11, Express, @nestjs/throttler, helmet, graphql-depth-limit, graphql-query-complexity, NestJS Logger

---

## File Map

| Arquivo | Operação | Task |
|---------|----------|------|
| `package.json` | Modify | 1 |
| `src/app.module.ts` | Modify | 1, 4, 7 |
| `src/main.ts` | Modify | 2, 3, 6 |
| `src/modules/auth/auth.resolver.ts` | Modify | 1 |
| `src/modules/users/users.resolver.ts` | Modify | 1 |
| `src/modules/upload-medias/upload-medias.controller.ts` | Modify | 1 |
| `src/modules/users/users.service.ts` | Modify | 5 |
| `src/modules/pag-seguro/pag-seguro.service.ts` | Modify | 5 |
| `src/modules/payments/payments.service.ts` | Modify | 5 |
| `src/modules/complaints/complaints.service.ts` | Modify | 5 |
| `src/modules/addresses/addresses.service.ts` | Modify | 5 |
| `src/modules/sms/sms.service.ts` | Modify | 5 |
| `src/modules/upload-medias/media-serve.controller.ts` | Create | 6 |

---

## Task 1: INFRA-01 — Rate Limiting com @nestjs/throttler

**Problema:** Login, CreateUser e upload podem ser chamados sem limite — permite brute-force e spam.

**Files:**
- Modify: `package.json`
- Modify: `src/app.module.ts`
- Modify: `src/modules/auth/auth.resolver.ts`
- Modify: `src/modules/users/users.resolver.ts`
- Modify: `src/modules/upload-medias/upload-medias.controller.ts`

---

- [ ] **Step 1: Instalar dependência**

```bash
cd /home/dioend/Documentos/Project/javascript/Date-Me-Encontre-Aqui
npm install @nestjs/throttler
```

Esperado: pacote adicionado ao `package.json` sem erros.

- [ ] **Step 2: Registrar ThrottlerModule no AppModule**

Em `src/app.module.ts`, adicionar nos imports (após `ScheduleModule.forRoot()`):

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
```

Adicionar no array `imports`:
```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
```

Adicionar no array `providers`:
```typescript
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

- [ ] **Step 3: Aplicar limite específico no endpoint de login**

Em `src/modules/auth/auth.resolver.ts`, adicionar decorator `@Throttle` no método `login`:

```typescript
import { Throttle } from '@nestjs/throttler';

// No método login:
@Public()
@Throttle({ default: { ttl: 60000, limit: 5 } }) // máx 5/min por IP
@Mutation(() => AuthResponse)
async login(
  @Args('loginInput') loginInput: LoginInput,
  @Context() Context,
): Promise<AuthResponse> {
  return await this.authService.login(loginInput);
}
```

- [ ] **Step 4: Aplicar limite no CreateUser**

Em `src/modules/users/users.resolver.ts`, adicionar decorator no método `CreateUser`:

```typescript
import { Throttle } from '@nestjs/throttler';

@Public()
@Throttle({ default: { ttl: 3600000, limit: 3 } }) // máx 3 registros/hora por IP
@Mutation(() => User, { description: 'Cria um user' })
CreateUser(@Args('createUserInput') createUserInput: CreateUserInput) {
  return this.usersService.create(createUserInput);
}
```

- [ ] **Step 5: Aplicar limite no upload**

Em `src/modules/upload-medias/upload-medias.controller.ts`, adicionar no controller:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('upload-medias')
@UseGuards(JwtRestAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 20 } }) // máx 20 uploads/min por user
export class UploadMediasController { ... }
```

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json \
        src/app.module.ts \
        src/modules/auth/auth.resolver.ts \
        src/modules/users/users.resolver.ts \
        src/modules/upload-medias/upload-medias.controller.ts
git commit -m "feat(infra): rate limiting com @nestjs/throttler — login 5/min, register 3/h, upload 20/min (INFRA-01)"
```

---

## Task 2: INFRA-02/03 — Helmet e CORS

**Problema:** Sem headers de segurança HTTP e CORS aceita qualquer origem.

**Files:**
- Modify: `src/main.ts`

---

- [ ] **Step 1: Instalar helmet**

```bash
npm install helmet
```

- [ ] **Step 2: Atualizar `main.ts` com Helmet e CORS**

Substituir o conteúdo de `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;

  // Bloquear MOCK_PRISMA em produção
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_PRISMA === 'true') {
    throw new Error('MOCK_PRISMA cannot be enabled in production — aborting');
  }

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.ENV === 'production' ? undefined : false,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST'],
  });

  // Limitar body GraphQL
  app.use('/graphql', express.json({ limit: '100kb' }));

  // Remover static assets — uploads servidos via endpoint autenticado (INFRA-07)
  // app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // era false — rejeitar campos extras
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port, '0.0.0.0');
}
bootstrap();
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 4: Verificar que servidor sobe normalmente**

```bash
curl -s -I http://localhost:3000/graphql | grep -E "x-frame|x-content|content-security" | head -5
```

Esperado: headers de segurança do Helmet presentes na resposta.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts package.json package-lock.json
git commit -m "feat(infra): Helmet, CORS configurado, forbidNonWhitelisted:true, body limit 100kb (INFRA-02/03/06/08)"
```

---

## Task 3: INFRA-04 — GraphQL depth e complexity limits

**Problema:** Sem limites de profundidade ou complexidade — DoS via queries aninhadas.

**Files:**
- Modify: `src/app.module.ts`

---

- [ ] **Step 1: Instalar dependências**

```bash
npm install graphql-depth-limit graphql-query-complexity
npm install --save-dev @types/graphql-depth-limit
```

- [ ] **Step 2: Adicionar validationRules no GraphQLModule**

Em `src/app.module.ts`, atualizar o `GraphQLModule.forRoot<ApolloDriverConfig>({...})`:

```typescript
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-query-complexity';

// Dentro de GraphQLModule.forRoot:
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  include: [ /* ... mantém lista existente ... */ ],
  introspection: process.env.ENV !== 'production',
  playground: process.env.ENV !== 'production',
  validationRules: [
    depthLimit(7),
    createComplexityLimitRule(1000),
  ],
  formatError: (error) => {
    if (process.env.ENV === 'production') {
      return {
        message: error.message,
        extensions: { code: error.extensions?.code },
      };
    }
    return error;
  },
}),
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

Se houver erro de tipos com `graphql-depth-limit`, adicionar em `tsconfig.json` ou usar cast:
```typescript
validationRules: [depthLimit(7) as any, createComplexityLimitRule(1000)],
```

- [ ] **Step 4: Testar que query muito profunda é rejeitada**

```bash
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { role { users { role { users { role { users { id } } } } } } } }"}' \
  | python3 -m json.tool | grep -i "depth\|error" | head -5
```

Esperado: erro de profundidade máxima excedida.

- [ ] **Step 5: Commit**

```bash
git add src/app.module.ts package.json package-lock.json
git commit -m "feat(graphql): depth limit 7 + complexity limit 1000 + formatError em produção (INFRA-04/09)"
```

---

## Task 4: INFRA-05 — Remover console.log com dados sensíveis

**Problema:** Dados de pagamento, webhook, denúncias e usuários são logados em texto puro em produção.

**Files a modificar:**
- `src/modules/users/users.service.ts:185`
- `src/modules/pag-seguro/pag-seguro.service.ts:76,107,126,176-178`
- `src/modules/payments/payments.service.ts:23,28,40`
- `src/modules/complaints/complaints.service.ts:22,30,52`
- `src/modules/addresses/addresses.service.ts:20`
- `src/modules/sms/sms.service.ts:33`

---

- [ ] **Step 1: Remover console.log em `users.service.ts`**

Remover a linha 185:
```typescript
console.log(`Attempting to update user with ID: ${userId}`);
```

- [ ] **Step 2: Limpar `pag-seguro.service.ts`**

Abrir `src/modules/pag-seguro/pag-seguro.service.ts`. Remover:
- Linha 76: `console.log('Chaves geradas com sucesso!')`
- Linha 107: `.then(res => console.log(res.data))`
- Linha 126: `console.log(formatStringJsonData)`
- Linhas 176-178: os 3 `console.log` de assinatura do webhook

- [ ] **Step 3: Limpar `payments.service.ts`**

Abrir `src/modules/payments/payments.service.ts`. Remover:
- Linha 23: `console.log(JSON.stringify(data, null, 2))`
- Linha 28: `console.log(paymentMethodFactory)`
- Linha 40: `console.log(dataPayment)`

- [ ] **Step 4: Limpar `complaints.service.ts`**

Abrir `src/modules/complaints/complaints.service.ts`. Remover:
- Linha 22: `console.log('Criando denúncia:', ...)`
- Linha 30: `console.log('Post encontrado:', ...)`
- Linha 52: `console.log({...})`

- [ ] **Step 5: Limpar `addresses.service.ts` e `sms.service.ts`**

- `src/modules/addresses/addresses.service.ts` linha 20: remover `console.log(user)`
- `src/modules/sms/sms.service.ts` linha 33: remover `console.log('SMS enviado com sucesso:', ...)`

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 7: Confirmar que não há mais console.log sensíveis**

```bash
grep -rn "console\.log" src/modules/ --include="*.ts" | grep -v spec | grep -v "node_modules"
```

Esperado: nenhuma linha crítica restante. Verificar cada resultado restante manualmente.

- [ ] **Step 8: Commit**

```bash
git add \
  src/modules/users/users.service.ts \
  src/modules/pag-seguro/pag-seguro.service.ts \
  src/modules/payments/payments.service.ts \
  src/modules/complaints/complaints.service.ts \
  src/modules/addresses/addresses.service.ts \
  src/modules/sms/sms.service.ts
git commit -m "fix(infra): remover console.log com dados sensíveis de payment, webhook e usuários (INFRA-05)"
```

---

## Task 5: INFRA-07 — Endpoint autenticado para servir uploads

**Problema:** `app.useStaticAssets(...)` serve todos os arquivos em `/uploads/` sem autenticação. Em uma plataforma adulta, mídia privada deve ser protegida.

**Files:**
- Create: `src/modules/upload-medias/media-serve.controller.ts`
- Modify: `src/modules/upload-medias/upload-medias.module.ts`

---

- [ ] **Step 1: Criar controller de servir mídia autenticado**

Criar `src/modules/upload-medias/media-serve.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
import { MediaService } from '../media/media.service';
import { CurrentUserRest } from '../auth/decorators/current-user-rest.decorator';

@Controller('media')
@UseGuards(JwtRestAuthGuard)
export class MediaServeController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':mediaId')
  async serveMedia(
    @Param('mediaId') mediaId: string,
    @CurrentUserRest() user: { id: string },
    @Res() res: Response,
  ) {
    const media = await this.mediaService.findById(mediaId);
    if (!media) throw new NotFoundException('Media not found');

    // Verificar se o arquivo pertence ao usuário autenticado
    if (media.ownerId !== user.id) throw new NotFoundException('Media not found');

    const filePath = join(process.cwd(), 'uploads', media.filename);
    if (!existsSync(filePath)) throw new NotFoundException('File not found');

    res.sendFile(filePath);
  }
}
```

- [ ] **Step 2: Adicionar `findById` no MediaService**

Em `src/modules/media/media.service.ts`, adicionar:

```typescript
async findById(mediaId: string) {
  return this.prisma.media.findUnique({ where: { id: mediaId } });
}
```

- [ ] **Step 3: Registrar o controller no módulo**

Em `src/modules/upload-medias/upload-medias.module.ts`, adicionar `MediaServeController` no array `controllers`:

```typescript
import { MediaServeController } from './media-serve.controller';

@Module({
  controllers: [UploadMediasController, MediaServeController],
  // ...
})
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add \
  src/modules/upload-medias/media-serve.controller.ts \
  src/modules/upload-medias/upload-medias.module.ts \
  src/modules/media/media.service.ts
git commit -m "feat(media): endpoint GET /media/:mediaId autenticado substitui static assets públicos (INFRA-07)"
```

---

## Verificação Final da Fase 3

- [ ] **Instalar dependências e garantir que tudo compila**

```bash
npm install
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Esperado: 0 erros.

- [ ] **Rodar toda a suite de testes**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Esperado: todos os testes passando, sem regressões.

- [ ] **Verificar que não restam console.log sensíveis**

```bash
grep -rn "console\.log" src/modules/ --include="*.ts" | grep -v spec
```

- [ ] **Verificar headers de segurança em resposta**

```bash
curl -s -I http://localhost:3000/graphql | grep -iE "x-frame|x-content|helmet|strict-transport" | head -5
```

Esperado: pelo menos `x-frame-options` e `x-content-type-options` presentes.

- [ ] **Commit final e push da branch**

```bash
git push origin feat/security-audit-2026-04-23
```
