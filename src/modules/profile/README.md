# Módulo: Profile

## 1. Propósito

O módulo `profile` materializa a camada de apresentação do usuário, separando-a da entidade de autenticação (`User`). Hoje contém:

- `gender` — enum obrigatório identificando o gênero do usuário na plataforma.
- `preferences` — array de enum (≥1) com os gêneros/orientações que o usuário deseja encontrar. Consumido por feed, descoberta e match.
- `bio` — texto livre opcional (≤500 caracteres) exibido no perfil público.

Declarado em [`./profile.module.ts`](./profile.module.ts); expõe:

- `ProfileService` ([`./profile.service.ts`](./profile.service.ts)) — `createForUser`, `findByUserId`, `updateByUserId`.
- `ProfileResolver` ([`./profile.resolver.ts`](./profile.resolver.ts)) — `myProfile`, `getProfileByUserId`, `updateMyProfile` e o field-resolver `User.profile`.

## 2. Regras de Negócio

- `gender` e `preferences` são **obrigatórios no cadastro** (ver [`../users/dto/create-user.input.ts`](../users/dto/create-user.input.ts)).
- `preferences` exige `ArrayMinSize(1)` no DTO — impede esvaziar as preferências em um `updateMyProfile`.
- `bio` opcional; limite duplo: `@MaxLength(500)` no DTO e `@db.VarChar(500)` no banco.
- Profile é criado na **mesma transação** que o User (`UsersService.create` → `prisma.$transaction`).
- `userId` é `@unique` no model — 1:1 garantido no banco.
- `onDelete: Cascade` — hard delete do User remove o Profile junto.
- `userId` não é aceito em `UpdateProfileInput` (herda de `CreateProfileInput` via `PartialType`, que não contém `userId`). Usuário não troca de dono.
- `ProfileService.updateByUserId` faz pick explícito dos campos (`gender`, `preferences`, `bio`) ao montar o `data` do Prisma — mesmo padrão de `createForUser`. Isso protege contra mass-assignment caso `UpdateProfileInput` ganhe campos internos no futuro.
- `ProfileService.updateByUserId` não aceita `Prisma.TransactionClient` (assimetria proposital com `createForUser`): o update ocorre sempre em requisição de usuário autenticado, nunca aninhado em transação maior. YAGNI até surgir um caso real.

## 3. Entidades e Modelo de Dados

Declarado em [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma):

```prisma
model Profile {
  id          String    @id @default(uuid())
  userId      String    @unique @map("user_id")
  gender      Gender
  preferences Gender[]  @default([])
  bio         String?   @db.VarChar(500)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime? @updatedAt       @map("updated_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([gender])
  @@map("profiles")
}
```

Enum `Gender` em Prisma e espelhado em TS ([`./enums/gender.enum.ts`](./enums/gender.enum.ts)):

```
WOMAN | TRANS_WOMAN | MAN | TRANS_MAN |
COUPLE_HE_SHE | COUPLE_HE_HE | COUPLE_SHE_SHE |
GAY | LESBIAN | TRAVESTI
```

## 4. API GraphQL

| Operação | Tipo | Argumentos | Retorno | Auth |
|---|---|---|---|---|
| `myProfile` | Query | — | `Profile?` | `GqlAuthGuard` |
| `getProfileByUserId` | Query | `userId: String` | `Profile?` | `GqlAuthGuard` |
| `updateMyProfile` | Mutation | `input: UpdateProfileInput` | `Profile` | `GqlAuthGuard` |
| `User.profile` | Field | — | `Profile?` | (herda do pai) |

### Inputs

- `CreateProfileInput` — usado como sub-campo de `CreateUserInput`.
- `UpdateProfileInput = PartialType(CreateProfileInput)` — `preferences` mantém `ArrayMinSize(1)` se enviado.

### Exemplo

```graphql
query {
  myProfile {
    id
    gender
    preferences
    bio
  }
}

mutation {
  updateMyProfile(input: { bio: "olá" }) {
    id
    bio
  }
}
```

## 5. Fluxos Principais

### 5.1 Cadastro atômico

`CreateUser` persiste `User`, `Address` e `Profile` em `prisma.$transaction`. Se qualquer passo falha, tudo faz rollback. SMS (`SmsService.sendSms`) segue fora da transação, preservando o comportamento fire-and-forget do módulo `users`.

### 5.2 Atualização

`updateMyProfile` só opera sobre o profile do próprio usuário autenticado (`me.id` do JWT). Não aceita `userId` do cliente.

### 5.3 Leitura aninhada

`User.profile` é resolvido sob demanda via `@ResolveField` em `ProfileResolver` (declarado com `@Resolver(() => UserDTO)`). N+1 é aceitável nesta fase — adicionar DataLoader fica como follow-up se benchmarks justificarem.

## 6. Dependências

- `PrismaModule` — `PrismaService`.
- `@nestjs/graphql` — decorators.
- `class-validator` / `class-transformer` — validação dos DTOs.

## 7. Testes

- [`./profile.service.spec.ts`](./profile.service.spec.ts) — service completo com mock do Prisma.
- [`./profile.resolver.spec.ts`](./profile.resolver.spec.ts) — resolver com mock do service.
- [`./dto/create-profile.input.spec.ts`](./dto/create-profile.input.spec.ts) — validação de DTO.

Executar:

```bash
npm run test -- profile
```

## 8. Pontos de Atenção / Manutenção

- **Sem DataLoader em `User.profile`** — N+1 em listagens grandes; avaliar quando surgirem feed/descoberta.
- **Dois tipos de User no schema** — `UserEntity` vs `UserDTO` (débito técnico do módulo `users`). O `ProfileResolver` alveja `UserDTO`; queries que retornam `UserEntity` não expõem `profile`. Follow-up sugerido: unificar no módulo `users`.
- **Avatar e galeria continuam no `User`** — migrar para `Profile` é follow-up explícito do plano de entrega 2026-04-18.
- **`followers`** — não implementado; entrará em PR dedicado.
