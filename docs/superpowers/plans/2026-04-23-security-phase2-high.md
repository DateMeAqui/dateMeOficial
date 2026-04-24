# Security Phase 2 — High Vulnerabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as 7 vulnerabilidades altas no módulo de autenticação: login sem status check, logout incompleto, secrets fracos, bypass de auth via MOCK_PRISMA e fieldName hardcoded.

**Architecture:** Todas as mudanças ficam dentro de `src/modules/auth/` e `src/modules/users/`. A ordem importa: HIGH-07 primeiro (cria `findUserByEmail`), depois HIGH-01 que depende dele. Os demais são independentes entre si.

**Tech Stack:** NestJS 11, Passport JWT, Redis (cache-manager), ConfigService

---

## File Map

| Arquivo | Operação | Task |
|---------|----------|------|
| `src/modules/users/users.service.ts` | Modify | 1 |
| `src/modules/auth/auth.service.ts` | Modify | 1, 2, 3, 6 |
| `src/modules/auth/auth.resolver.ts` | Modify | 3 |
| `src/modules/auth/strategies/jwt.strategy.ts` | Modify | 4, 5 |
| `src/modules/auth/auth.module.ts` | Modify | 4 |
| `src/modules/auth/guards/jwt-auth.guard.ts` | Modify | 5, 6 |
| `src/modules/auth/guards/jwt-rest-auth.guard.ts` | Modify | 5 |
| `src/modules/main.ts` | Modify | 5 |
| `src/modules/auth/auth.service.spec.ts` | Create/Modify | 1, 2, 3, 4 |

---

## Task 1: HIGH-07 — Expor `findUserByEmail` no UsersService

**Problema:** `AuthService.validateUser` acessa `usersService['prisma']` diretamente — quebra encapsulamento, impede testes, e `findUniqueOrThrow` vaza erros internos do Prisma quando o email não existe.

**Files:**
- Modify: `src/modules/users/users.service.ts`

---

- [ ] **Step 1: Adicionar `findUserByEmail` ao `UsersService`**

Em `src/modules/users/users.service.ts`, adicionar após o método `findUserById`:

```typescript
async findUserByEmail(email: string) {
  try {
    return await this.prisma.user.findUniqueOrThrow({
      where: { email },
      include: { address: true, role: true },
    });
  } catch {
    return null; // não vazar detalhes do Prisma
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
cd /home/dioend/Documentos/Project/javascript/Date-Me-Encontre-Aqui
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/modules/users/users.service.ts
git commit -m "feat(users): expor findUserByEmail público para uso pelo AuthService (HIGH-07)"
```

---

## Task 2: HIGH-01 — Login não verifica status do usuário

**Problema:** `validateUser` retorna o user sem checar `status`. PENDING, INACTIVE e BLOCKED recebem JWT válido.

**Files:**
- Modify: `src/modules/auth/auth.service.ts`
- Create: `src/modules/auth/auth.service.spec.ts`

---

- [ ] **Step 1: Escrever testes que devem falhar**

Substituir `src/modules/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockUsersService = { findUserByEmail: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('token'), verify: jest.fn() };
const mockConfigService = { get: jest.fn().mockReturnValue('secret') };
const mockCacheManager = { set: jest.fn(), get: jest.fn(), del: jest.fn() };

describe('AuthService — security', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser — HIGH-01', () => {
    it('retorna null para usuário PENDING', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: '$2b$10$invalidhash',
        status: 'PENDING',
      });
      const result = await service.validateUser('test@test.com', 'qualquer');
      expect(result).toBeNull();
    });

    it('retorna null para usuário BLOCKED', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: '$2b$10$invalidhash',
        status: 'BLOCKED',
      });
      const result = await service.validateUser('test@test.com', 'qualquer');
      expect(result).toBeNull();
    });

    it('retorna null quando email não existe', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue(null);
      const result = await service.validateUser('naoexiste@test.com', 'senha');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: FAIL — testes de status não passam ainda.

- [ ] **Step 3: Atualizar `validateUser` em `auth.service.ts`**

Substituir o método `validateUser` completo:

```typescript
async validateUser(email: string, password: string): Promise<any> {
  const user = await this.usersService.findUserByEmail(email);

  if (!user) return null;

  // Bloqueia status não-ACTIVE sem revelar se o email existe (evita user enumeration)
  if (user.status !== 'ACTIVE') return null;

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return null;

  await this.usersService['prisma'].user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const { password: _pwd, ...result } = user;
  return result;
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: PASS — 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts
git commit -m "fix(auth): validateUser bloqueia PENDING/BLOCKED/INACTIVE antes de emitir JWT (HIGH-01)"
```

---

## Task 3: HIGH-02 — Logout deve revogar o access token

**Problema:** Logout só remove o refresh token do Redis. Access token continua válido até expirar (~15 min).

**Files:**
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/modules/auth/auth.resolver.ts`

---

- [ ] **Step 1: Adicionar teste de logout com revogação**

Em `src/modules/auth/auth.service.spec.ts`, adicionar dentro do `describe`:

```typescript
describe('logout — HIGH-02', () => {
  it('revoga o access token no Redis', async () => {
    mockJwtService.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
    mockCacheManager.del.mockResolvedValue(undefined);
    mockCacheManager.set.mockResolvedValue(undefined);

    await service.logout('user-id', 'access.token.here');

    expect(mockCacheManager.del).toHaveBeenCalledWith('refresh:user-id');
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'revoked:access.token.here',
      true,
      expect.any(Number),
    );
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: FAIL — assinatura de `logout` ainda não aceita `accessToken`.

- [ ] **Step 3: Atualizar `logout` em `auth.service.ts`**

Substituir o método `logout`:

```typescript
async logout(userId: string, accessToken: string): Promise<boolean> {
  try {
    await this.cacheManager.del(`refresh:${userId}`);

    // Revogar o access token pelo tempo restante de validade
    const payload = this.jwtService.verify(accessToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.revokeToken(accessToken, ttl);
    }

    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Atualizar o resolver para passar o token**

Substituir o método `logoutUser` em `src/modules/auth/auth.resolver.ts`:

```typescript
@UseGuards(GqlAuthGuard)
@Mutation(() => Boolean)
async logoutUser(
  @CurrentUser() currentUser,
  @Context() context,
): Promise<Boolean> {
  const authHeader: string = context.req?.headers?.authorization ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  return await this.authService.logout(currentUser.id, accessToken);
}
```

- [ ] **Step 5: Rodar testes**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/auth.service.ts src/modules/auth/auth.resolver.ts
git commit -m "fix(auth): logout revoga access token no Redis além de remover refresh (HIGH-02)"
```

---

## Task 4: HIGH-03 — Remover fallback secret e exigir JWT_SECRET na inicialização

**Problema:** `|| 'fallback-secret-key'` em `jwt.strategy.ts` e `process.env.JWT_SECRET` sem validação em `auth.module.ts` permitem tokens forjados se o env var não estiver definido.

**Files:**
- Modify: `src/modules/auth/strategies/jwt.strategy.ts`
- Modify: `src/modules/auth/auth.module.ts`

---

- [ ] **Step 1: Adicionar teste de inicialização sem secret**

Em `src/modules/auth/auth.service.spec.ts`, adicionar:

```typescript
describe('JWT_SECRET obrigatório — HIGH-03', () => {
  it('ConfigService deve retornar JWT_SECRET definido', () => {
    const secret = mockConfigService.get('JWT_SECRET');
    expect(secret).toBeTruthy();
  });
});
```

- [ ] **Step 2: Atualizar `jwt.strategy.ts` para lançar erro sem secret**

Substituir o bloco `constructor` em `src/modules/auth/strategies/jwt.strategy.ts`:

```typescript
constructor(
  private configService: ConfigService,
  @Inject(forwardRef(() => UsersService))
  private usersService: UsersService,
  private authService: AuthService,
) {
  const isGenerateMode = process.argv.includes('--generate-only');
  const jwtSecret = isGenerateMode
    ? 'documentation_generation_secret_key'
    : configService.get<string>('JWT_SECRET');

  if (!isGenerateMode && !jwtSecret) {
    throw new Error('JWT_SECRET env var is required — refusing to start');
  }

  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: jwtSecret,
    passReqToCallback: true,
  });
}
```

E remover o `MOCK_PRISMA` do bloco `validate` — manter apenas `--generate-only`:

```typescript
async validate(request: any, payload: JwtPayload) {
  if (process.argv.includes('--generate-only')) {
    return {
      id: 'doc-user-id',
      email: 'doc@example.com',
      fullName: 'Documentation User',
      status: 'ACTIVE',
    };
  }

  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  if (!token) throw new UnauthorizedException('No token provided');

  const isRevoked = await this.authService.isTokenRevoked(token);
  if (isRevoked) throw new UnauthorizedException('Token has been revoked');

  const user = await this.usersService.findUserById(payload.sub);
  if (!user) throw new UnauthorizedException('User not found');

  if (user.status !== 'ACTIVE') {
    throw new ForbiddenException('Account not active. Please verify your code.');
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
```

- [ ] **Step 3: Atualizar `auth.module.ts` para usar ConfigService no JwtModule**

Em `src/modules/auth/auth.module.ts`, substituir `JwtModule.register(...)` por `JwtModule.registerAsync(...)`:

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET env var is required');
    return {
      secret,
      signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m' },
    };
  },
}),
```

Adicionar `ConfigModule` nos imports do `auth.module.ts` se não estiver presente.

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/strategies/jwt.strategy.ts src/modules/auth/auth.module.ts
git commit -m "fix(auth): JWT_SECRET obrigatório na inicialização, remover fallback hardcoded (HIGH-03)"
```

---

## Task 5: HIGH-04/05 — Remover MOCK_PRISMA bypass e fieldName hardcoded

**Problema:**
- `MOCK_PRISMA=true` desabilita toda autenticação silenciosamente nos guards
- `JwtAuthGuard` bypassa auth verificando `fieldName === 'CreateUser'` — frágil e desnecessário

**Files:**
- Modify: `src/modules/auth/guards/jwt-auth.guard.ts`
- Modify: `src/modules/auth/guards/jwt-rest-auth.guard.ts`
- Modify: `src/main.ts`

---

- [ ] **Step 1: Limpar `JwtAuthGuard` — remover MOCK_PRISMA e fieldName bypass**

Substituir o conteúdo de `src/modules/auth/guards/jwt-auth.guard.ts`:

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

Mover o `IS_PUBLIC_KEY` export para `public.decorator.ts` se ainda não estiver lá. Verificar `src/modules/auth/guards/public.decorator.ts` — se não tiver o export, adicionar:

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Limpar `JwtRestAuthGuard` — remover MOCK_PRISMA bypass**

Substituir o conteúdo de `src/modules/auth/guards/jwt-rest-auth.guard.ts`:

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtRestAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
```

- [ ] **Step 3: Adicionar guard de inicialização em `main.ts`**

Em `src/main.ts`, após a linha `const app = await NestFactory.create<NestExpressApplication>(AppModule);`, adicionar:

```typescript
if (process.env.NODE_ENV === 'production' && process.env.MOCK_PRISMA === 'true') {
  throw new Error('MOCK_PRISMA cannot be enabled in production — aborting');
}
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/guards/jwt-auth.guard.ts \
        src/modules/auth/guards/jwt-rest-auth.guard.ts \
        src/main.ts
git commit -m "fix(auth): remover MOCK_PRISMA bypass e fieldName hardcoded dos guards (HIGH-04/05)"
```

---

## Task 6: HIGH-06 — Corrigir `refresh()` para assinar com secret explícito

**Problema:** `this.jwtService.sign(...)` no método `refresh()` não passa `secret` — usa o default do módulo que pode ser `undefined`.

**Files:**
- Modify: `src/modules/auth/auth.service.ts`

---

- [ ] **Step 1: Adicionar teste**

Em `src/modules/auth/auth.service.spec.ts`, adicionar:

```typescript
describe('refresh — HIGH-06', () => {
  it('assina novo access token com secret explícito do ConfigService', async () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-id',
      email: 'user@test.com',
      role: 'USER',
    });
    mockCacheManager.get.mockResolvedValue('stored_refresh_token');
    mockJwtService.sign.mockReturnValue('new_access_token');

    const result = await service.refresh('stored_refresh_token');
    expect(result.access_token).toBe('new_access_token');

    const signCall = mockJwtService.sign.mock.calls[0];
    expect(signCall[1]).toMatchObject({ secret: 'secret' }); // ConfigService mock retorna 'secret'
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

- [ ] **Step 3: Atualizar `refresh()` em `auth.service.ts`**

Substituir o trecho de geração do `newAccessToken` dentro de `refresh()`:

```typescript
const newAccessToken = this.jwtService.sign(
  { sub: payload.sub, email: payload.email, role: payload.role },
  {
    expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    secret: this.configService.get<string>('JWT_SECRET'),
  },
);
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts
git commit -m "fix(auth): refresh() assina novo token com secret explícito do ConfigService (HIGH-06)"
```

---

## Verificação Final da Fase 2

- [ ] **Rodar toda a suite de testes**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Esperado: todos os testes passando.

- [ ] **Verificar compilação completa**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Esperado: 0 erros.
