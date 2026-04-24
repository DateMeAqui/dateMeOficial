# Security Phase 1 — Critical Vulnerabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as 7 vulnerabilidades críticas que permitem exploração imediata sem autenticação ou com baixo esforço.

**Architecture:** Cada task é um fix isolado que não quebra outros módulos. A ordem importa: CRIT-01/02 primeiro (impede escalonamento de privilégio), depois as rotas abertas, depois o rate limiting (requer migration Prisma), por último configurações globais.

**Tech Stack:** NestJS 11, GraphQL Apollo, Prisma, PostgreSQL, Redis (cache-manager), Passport JWT

---

## File Map

| Arquivo | Operação | Task |
|---------|----------|------|
| `src/modules/users/users.service.ts` | Modify | 1 |
| `src/modules/users/users.service.spec.ts` | Create | 1 |
| `src/modules/pag-seguro/pag-seguro.resolver.ts` | Modify | 2 |
| `src/modules/subscriptions/subscriptions.resolver.ts` | Modify | 3 |
| `src/modules/subscriptions/dto/create-subscription.input.ts` | Modify | 3 |
| `prisma/schema.prisma` | Modify | 4 |
| `src/modules/users/users.service.ts` | Modify | 4 |
| `src/modules/users/users.resolver.ts` | Modify | 4 |
| `src/app.module.ts` | Modify | 5 |
| `src/modules/posts/posts.resolver.ts` | Modify | 6 |
| `src/modules/comments/comments.resolver.ts` | Modify | 6 |

---

## Task 1: CRIT-01/02 — Fix IDOR em updateUser e bloquear escalada de role

**Problema:** A condição `me.roleId === 1` está invertida — só bloqueia SUPER_ADMIN, deixando USER editar qualquer outro usuário. Além disso, `UpdateUserInput` herda `roleId` de `CreateUserInput`, permitindo que um USER se torne ADMIN.

**Files:**
- Modify: `src/modules/users/users.service.ts:196-198` (updateUser) e `:255-258` (softDelete)
- Create: `src/modules/users/users.service.spec.ts`

---

- [ ] **Step 1: Escrever os testes que devem falhar**

Criar `src/modules/users/users.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { ProfileService } from '../profile/profile.service';
import { CalculateDateBrazilNow } from '../../utils/calculate_date_brazil_now';

const mockPrisma = {
  user: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    findFirstOrThrow: jest.fn(),
  },
  address: { update: jest.fn() },
};

const mockSms = { sendSms: jest.fn() };
const mockProfile = { createForUser: jest.fn() };
const mockDate = { brazilDate: jest.fn().mockReturnValue(new Date()) };

describe('UsersService — security', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsService, useValue: mockSms },
        { provide: ProfileService, useValue: mockProfile },
        { provide: CalculateDateBrazilNow, useValue: mockDate },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('updateUser — IDOR (CRIT-01)', () => {
    it('USER não pode atualizar outro usuário', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'other-user-id',
        address: null,
        status: 'ACTIVE',
      });
      const me = { id: 'my-id', roleId: 3 }; // USER
      await expect(
        service.updateUser('other-user-id', { fullName: 'Hack' } as any, me),
      ).rejects.toThrow(ForbiddenException);
    });

    it('USER pode atualizar a si mesmo', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'my-id',
        address: null,
        status: 'ACTIVE',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'my-id', fullName: 'Novo Nome' });
      const me = { id: 'my-id', roleId: 3 };
      await expect(
        service.updateUser('my-id', { fullName: 'Novo Nome' } as any, me),
      ).resolves.toBeDefined();
    });

    it('ADMIN pode atualizar qualquer usuário', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'other-id',
        address: null,
        status: 'ACTIVE',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'other-id' });
      const me = { id: 'admin-id', roleId: 2 }; // ADMIN
      await expect(
        service.updateUser('other-id', { fullName: 'Ok' } as any, me),
      ).resolves.toBeDefined();
    });
  });

  describe('updateUser — roleId escalation (CRIT-02)', () => {
    it('USER não pode escalar o próprio roleId', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'my-id',
        address: null,
        status: 'ACTIVE',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'my-id', roleId: 3 });
      const me = { id: 'my-id', roleId: 3 };
      await service.updateUser('my-id', { roleId: 1 as any } as any, me);
      // roleId não deve ter sido passado ao update
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.roleId).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd /home/dioend/Documentos/Project/javascript/Date-Me-Encontre-Aqui
npx jest src/modules/users/users.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: FAIL — `ForbiddenException` não lançada nos testes de IDOR.

- [ ] **Step 3: Implementar a correção em `users.service.ts`**

Substituir o bloco em `updateUser` (linhas 185–198):

```typescript
async updateUser(userId: string, updateData: UpdateUserInput, me: any) {
  const user = await this.prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { address: true },
  });

  const isAdmin = me.roleId === 1 || me.roleId === 2; // SUPER_ADMIN ou ADMIN

  if (user.id !== me.id && !isAdmin) {
    throw new ForbiddenException('You do not have permission to update this user');
  }

  // Impede escalada de role por usuários não-admin (CRIT-02)
  if (!isAdmin && updateData.roleId !== undefined) {
    delete updateData.roleId;
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  if (updateData.status === 'PENDING' && user.status !== 'PENDING') {
    updateData.status = user.status as StatusUser;
  }

  const { address, profile: _profile, ...userData } = updateData;
  try {
    const userUpdated = await this.prisma.user.update({
      where: { id: userId },
      data: userData,
      include: { address: true },
    });

    if (address) {
      await this.prisma.address.update({
        where: { id: user.address?.id },
        data: address,
      });
    }

    return userUpdated;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}
```

Também corrigir `softDelete` (bloco em torno da linha 255) para usar a mesma constante `isAdmin`:

```typescript
async softDelete(userId: string, me: any): Promise<User | null> {
  const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId } });

  const isAdmin = me.roleId === 1 || me.roleId === 2;
  if (user.id !== me.id && !isAdmin) {
    throw new ForbiddenException('You do not have permission to delete this user');
  }

  const now = new Date();
  const brazilDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  if (user.deletedAt === null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: brazilDate, status: StatusUser.INACTIVE },
      include: { address: true, role: true },
    });
  }
  return null;
}
```

Adicionar import no topo do arquivo (se não existir):
```typescript
import { ForbiddenException } from '@nestjs/common';
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
npx jest src/modules/users/users.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: PASS — 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.service.ts src/modules/users/users.service.spec.ts
git commit -m "fix(users): corrigir IDOR em updateUser e bloquear escalada de roleId (CRIT-01/02)"
```

---

## Task 2: CRIT-03 — Adicionar guards no PagSeguro resolver

**Problema:** `createAndPaymentOrder`, `consultOrderById` e `payOrderById` não têm `@UseGuards` — operações financeiras acessíveis sem autenticação.

**Files:**
- Modify: `src/modules/pag-seguro/pag-seguro.resolver.ts`

---

- [ ] **Step 1: Adicionar `@UseGuards(GqlAuthGuard)` nas 3 operações**

Substituir o conteúdo de `src/modules/pag-seguro/pag-seguro.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PagSeguroService } from './pag-seguro.service';
import { CreateOrderInput } from './dto/create-order.input';
import { GraphQLJSON } from 'graphql-type-json';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver()
export class PagSeguroResolver {
  constructor(private readonly pagSeguroService: PagSeguroService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => GraphQLJSON, { description: 'cria e paga um pedido' })
  createAndPaymentOrder(
    @CurrentUser() _me: { id: string },
    @Args('create') create: CreateOrderInput,
  ) {
    return this.pagSeguroService.createAndPaymentOrder(create);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => GraphQLJSON)
  consultOrderById(
    @CurrentUser() _me: { id: string },
    @Args('id') id: string,
  ) {
    return this.pagSeguroService.consultOrder(id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => GraphQLJSON)
  payOrderById(
    @CurrentUser() _me: { id: string },
    @Args('id') id: string,
  ) {
    return this.pagSeguroService.naoSeiOrder(id);
  }
}
```

- [ ] **Step 2: Verificar que o servidor compila sem erros**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

Esperado: nenhum erro de compilação.

- [ ] **Step 3: Commit**

```bash
git add src/modules/pag-seguro/pag-seguro.resolver.ts
git commit -m "fix(pagseguro): adicionar GqlAuthGuard em todas as operações financeiras (CRIT-03)"
```

---

## Task 3: CRIT-04 — Proteger createSubscription e derivar userId do token

**Problema:** `createSubscription` sem guard — qualquer pessoa cria assinaturas para qualquer `userId`.

**Files:**
- Modify: `src/modules/subscriptions/subscriptions.resolver.ts`
- Modify: `src/modules/subscriptions/dto/create-subscription.input.ts`

---

- [ ] **Step 1: Tornar `userId` opcional no DTO (será preenchido pelo resolver)**

Substituir em `src/modules/subscriptions/dto/create-subscription.input.ts` o campo `userId`:

```typescript
@Field(() => String, { nullable: true })
@IsOptional()
@IsString()
userId?: string;
```

- [ ] **Step 2: Atualizar o resolver para usar `@CurrentUser`**

Substituir o conteúdo de `src/modules/subscriptions/subscriptions.resolver.ts`:

```typescript
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Subscription)
export class SubscriptionsResolver {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Subscription)
  createSubscription(
    @CurrentUser() me: { id: string },
    @Args('createSubscriptionInput') input: CreateSubscriptionInput,
  ) {
    input.userId = me.id; // nunca aceitar userId externo
    return this.subscriptionsService.create(input);
  }
}
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/subscriptions/subscriptions.resolver.ts \
        src/modules/subscriptions/dto/create-subscription.input.ts
git commit -m "fix(subscriptions): proteger createSubscription com auth e derivar userId do token (CRIT-04)"
```

---

## Task 4: CRIT-05 — verificationCode: 6 dígitos, expiração e rate limiting

**Problema:** Código de 4 dígitos sem expiração nem rate limiting — brute-force em ~9.000 tentativas.

**Files:**
- Modify: `prisma/schema.prisma` (campo `verificationCodeExpiresAt`)
- Modify: `src/modules/users/users.service.ts` (código 6 dígitos, expiração, rate limit)
- Modify: `src/modules/users/users.resolver.ts` (remover userId opcional, já é obrigatório)

---

- [ ] **Step 1: Adicionar campo no schema Prisma**

Em `prisma/schema.prisma`, dentro do model `User`, após a linha `verificationCode Int`:

```prisma
verificationCode      Int
verificationCodeExpiresAt DateTime? @map("verification_code_expires_at")
```

- [ ] **Step 2: Criar a migration**

```bash
npx prisma migrate dev --name add_verification_code_expires_at
```

Esperado: migration criada e aplicada. Novo arquivo em `prisma/migrations/`.

- [ ] **Step 3: Atualizar o método `create` em `users.service.ts`**

Localizar o trecho que cria o usuário (por volta da linha 23) e atualizar para código de 6 dígitos com expiração:

```typescript
const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
this.sms.sendSms(createUserInput.smartphone, verificationCode);
```

E na criação no banco, adicionar o campo:
```typescript
const createData: any = {
  ...userData,
  birthdate: birthdate,
  createdAt: brazilDate,
  password: hashedPassord,
  verificationCode: verificationCode,
  verificationCodeExpiresAt: verificationCodeExpiresAt,
  roleId: Number(createUserInput.roleId),
};
```

- [ ] **Step 4: Atualizar `activeStatusWithVerificationCode` com expiração e rate limit**

Substituir o método `activeStatusWithVerificationCode` em `users.service.ts`:

```typescript
async activeStatusWithVerificationCode(userId: string, verificationCode: number) {
  // Rate limiting via Redis: máx 5 tentativas por userId em 15 min
  const attemptsKey = `verify_attempts:${userId}`;
  const lockoutKey = `verify_lockout:${userId}`;

  const isLocked = await this.cacheManager.get(lockoutKey);
  if (isLocked) {
    throw new ForbiddenException('Too many attempts. Try again in 30 minutes.');
  }

  const attempts = ((await this.cacheManager.get<number>(attemptsKey)) ?? 0) + 1;
  await this.cacheManager.set(attemptsKey, attempts, 15 * 60); // TTL 15 min

  if (attempts > 5) {
    await this.cacheManager.set(lockoutKey, true, 30 * 60); // lockout 30 min
    await this.cacheManager.del(attemptsKey);
    throw new ForbiddenException('Too many attempts. Try again in 30 minutes.');
  }

  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Verificar expiração do código
  if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) {
    throw new BadRequestException('Verification code has expired. Request a new one.');
  }

  if (user.verificationCode !== verificationCode) {
    throw new BadRequestException('Code the verification invalid!');
  }

  // Código correto: limpar tentativas e ativar
  await this.cacheManager.del(attemptsKey);

  return this.prisma.user.update({
    where: { id: userId },
    data: { status: StatusUser.ACTIVE },
  });
}
```

Adicionar imports no topo do arquivo (se não existirem):
```typescript
import { BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
```

Adicionar `cacheManager` ao construtor:
```typescript
constructor(
  private prisma: PrismaService,
  private sms: SmsService,
  private calculateDateBrazilNow: CalculateDateBrazilNow,
  private profileService: ProfileService,
  @Inject(CACHE_MANAGER) private cacheManager: Cache,
) {}
```

Adicionar `CacheModule` ou `CACHE_MANAGER` ao `UsersModule` imports se não estiver presente. Verificar em `src/modules/users/users.module.ts`.

- [ ] **Step 5: Verificar compilação e rodar testes existentes**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
npx jest src/modules/users/ --no-coverage 2>&1 | tail -20
```

Esperado: sem erros de compilação, testes passando.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ \
        src/modules/users/users.service.ts \
        src/modules/users/users.resolver.ts
git commit -m "fix(users): verificationCode 6 dígitos + expiração 15min + rate limiting Redis (CRIT-05)"
```

---

## Task 5: CRIT-06 — Introspection e Playground condicionais

**Problema:** Schema GraphQL exposto em produção via `introspection: true` e `playground: true`.

**Files:**
- Modify: `src/app.module.ts`

---

- [ ] **Step 1: Tornar introspection e playground condicionais ao ambiente**

Em `src/app.module.ts`, dentro de `GraphQLModule.forRoot<ApolloDriverConfig>({...})`, substituir:

```typescript
introspection: true,
playground: true
```

por:

```typescript
introspection: process.env.ENV !== 'production',
playground: process.env.ENV !== 'production',
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Testar localmente que em dev ainda funciona**

Com `ENV=development` no `.env` (padrão), o playground deve estar acessível em `http://localhost:3000/graphql`. Confirmar que o servidor sobe normalmente:

```bash
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' | python3 -m json.tool | head -5
```

Esperado em dev: retorna tipos do schema.

- [ ] **Step 4: Commit**

```bash
git add src/app.module.ts
git commit -m "fix(graphql): desabilitar introspection e playground em produção (CRIT-06)"
```

---

## Task 6: CRIT-07 — Proteger queries de Posts e Comments

**Problema:** `posts`, `post(id)`, `commentsByPost`, `comment(id)` são públicos — conteúdo adulto acessível sem autenticação.

**Files:**
- Modify: `src/modules/posts/posts.resolver.ts`
- Modify: `src/modules/comments/comments.resolver.ts`

---

- [ ] **Step 1: Adicionar guards nas queries de Posts**

Substituir o conteúdo de `src/modules/posts/posts.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { CreatePostInput } from './dto/create-post.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Post)
  createPost(
    @Args('createPostInput') createPostInput: CreatePostInput,
    @CurrentUser() user: User,
  ) {
    createPostInput.authorId = user.id;
    return this.postsService.create(createPostInput);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Post], { name: 'posts' })
  findAll() {
    return this.postsService.findAll();
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Post, { name: 'post' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.postsService.findOne(id);
  }
}
```

- [ ] **Step 2: Adicionar guards nas queries de Comments**

Substituir o conteúdo de `src/modules/comments/comments.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment)
  createComment(
    @Args('createCommentInput') input: CreateCommentInput,
    @CurrentUser() me,
  ) {
    return this.commentsService.create(me.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Comment], { name: 'commentsByPost' })
  findByPost(@Args('postId', { type: () => ID }) postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Comment, { name: 'comment' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.commentsService.findOne(id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment, { name: 'removeComment' })
  remove(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() me,
  ) {
    return this.commentsService.remove(id, me.id);
  }
}
```

- [ ] **Step 3: Verificar compilação e testes**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
npx jest src/modules/posts/ src/modules/comments/ --no-coverage 2>&1 | tail -20
```

Esperado: sem erros de compilação, testes passando.

- [ ] **Step 4: Commit final da Fase 1**

```bash
git add src/modules/posts/posts.resolver.ts src/modules/comments/comments.resolver.ts
git commit -m "fix(posts/comments): exigir autenticação em queries de leitura (CRIT-07)"
```

---

## Verificação Final da Fase 1

- [ ] **Rodar toda a suite de testes**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Esperado: todos os testes passando, sem regressões.

- [ ] **Verificar compilação completa**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Esperado: 0 erros.
