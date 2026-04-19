# Módulo: Follow

## 1. Propósito

O módulo `follow` implementa o relacionamento assimétrico de seguimento entre `Profile`s — estilo Instagram/X — permitindo que um usuário siga outro sem necessidade de aprovação mútua. É a base para funcionalidades futuras de feed, descoberta e engajamento social.

Declarado em [`./follow.module.ts`](./follow.module.ts); expõe:

- `FollowService` ([`./follow.service.ts`](./follow.service.ts)) — `follow`, `unfollow`, `isFollowing`, `getFollowers`, `getFollowing`, `getFollowersCount`, `getFollowingCount`.
- `FollowResolver` ([`./follow.resolver.ts`](./follow.resolver.ts)) — mutations `followProfile`/`unfollowProfile`, queries `myFollowers`/`myFollowing`/`isFollowing` e field-resolvers `Profile.followersCount`/`Profile.followingCount`.

## 2. Regras de Negócio

- **Auto-follow proibido** — `BadRequestException` se `followerUserId` e `followingProfileId` resultarem no mesmo `Profile.id`.
- **Duplicata proibida** — P2002 do Prisma é capturado e relançado como `ConflictException` com mensagem amigável.
- **Unfollow idempotente** — `deleteMany` não lança erro se a relação não existir; retorna `true` silenciosamente.
- **Contadores calculados on-the-fly** — nenhuma coluna desnormalizada; `prisma.follow.count()` é chamado a cada request. Sem cache nesta versão.
- **Entrada sempre por `userId` do JWT** — o resolver nunca aceita `followerId` do cliente; usa `me.id` do `CurrentUser` e resolve o `Profile.id` internamente.
- **`onDelete: Cascade`** em ambos os lados da relação — deletar um `Profile` remove todos os seus registros de follow automaticamente.

## 3. Entidades e Modelo de Dados

Declarado em [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma):

```prisma
model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower    Profile  @relation("Follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following   Profile  @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
  @@map("follows")
}
```

Adições ao `Profile`:

```prisma
model Profile {
  // ...campos existentes...
  followers  Follow[]  @relation("Following")  // quem me segue
  following  Follow[]  @relation("Follower")   // quem eu sigo
}
```

**PK composta** `(followerId, followingId)` — previne duplicatas sem coluna `id` separada.  
**Dois índices** — `@@index([followerId])` acelera `getFollowing`/`isFollowing`; `@@index([followingId])` acelera `getFollowers`/`followersCount`.

## 4. API GraphQL

| Operação | Tipo | Argumentos | Retorno | Auth |
|---|---|---|---|---|
| `followProfile` | Mutation | `profileId: ID!` | `Follow` | `GqlAuthGuard` |
| `unfollowProfile` | Mutation | `profileId: ID!` | `Boolean` | `GqlAuthGuard` |
| `myFollowers` | Query | `page?: Int, limit?: Int` | `ProfilesWithPagination` | `GqlAuthGuard` |
| `myFollowing` | Query | `page?: Int, limit?: Int` | `ProfilesWithPagination` | `GqlAuthGuard` |
| `isFollowing` | Query | `profileId: ID!` | `Boolean` | `GqlAuthGuard` |
| `Profile.followersCount` | ResolveField | — | `Int` | (herda do pai) |
| `Profile.followingCount` | ResolveField | — | `Int` | (herda do pai) |

### DTOs

- `FollowDTO` — `followerId`, `followingId`, `createdAt`.
- `ProfilesWithPagination` — `profiles: ProfileDTO[]`, `total`, `page`, `limit`, `totalPages`.
- `ProfileDTO` ganhou os campos `followersCount` e `followingCount` (resolvidos sob demanda, não persistidos).

### Exemplo

```graphql
mutation {
  followProfile(profileId: "abc123") {
    followerId
    followingId
    createdAt
  }
}

mutation {
  unfollowProfile(profileId: "abc123")
}

query {
  myFollowers(page: 1, limit: 10) {
    profiles { id gender avatarUrl }
    total
    totalPages
  }

  isFollowing(profileId: "abc123")

  myProfile {
    followersCount
    followingCount
  }
}
```

## 5. Fluxos Principais

### 5.1 Follow

1. Resolver extrai `me.id` do JWT.
2. Service resolve `followerProfile` via `profile.findUniqueOrThrow({ where: { userId: me.id } })`.
3. Service resolve `followingProfile` via `profile.findUniqueOrThrow({ where: { id: profileId } })`.
4. Valida auto-follow.
5. Insere `Follow` com PK composta; captura P2002 como `ConflictException`.

### 5.2 Unfollow

1. Service resolve `followerProfile` pelo `userId`.
2. `follow.deleteMany` — no-op silencioso se não existir.

### 5.3 Listas paginadas (`myFollowers` / `myFollowing`)

1. Resolver busca o `Profile` do usuário autenticado.
2. Service executa `count` + `findMany` em paralelo com `Promise.all`.
3. Retorna `ProfilesWithPagination` com `totalPages = Math.ceil(total / limit)`.

### 5.4 Contadores como field-resolvers

`followersCount` e `followingCount` são declarados com `@ResolveField` em `FollowResolver` (apontando para `@Resolver(() => ProfileDTO)`). São calculados on-the-fly apenas quando o cliente solicita o campo — sem N+1 estrutural nesta versão pois cada `Profile` dispara dois `count`s.

## 6. Dependências

- `PrismaModule` — `PrismaService`.
- `ProfileModule` — `ProfileService` (para resolver `userId → Profile.id` no service) e `ProfileDTO` (target do `@Resolver`).
- `@nestjs/graphql` — decorators.

## 7. Testes

- [`./follow.service.spec.ts`](./follow.service.spec.ts) — cobertura completa do service com mock do Prisma.
- [`./follow.resolver.spec.ts`](./follow.resolver.spec.ts) — cobertura completa do resolver com mocks de `FollowService` e `ProfileService`.

Executar:

```bash
npm run test -- follow
```

## 8. Pontos de Atenção / Manutenção

- **Sem DataLoader** — `followersCount`/`followingCount` disparam um `count` por `Profile` em listagens; avaliar quando feed/descoberta tornar isso crítico.
- **Contadores não cacheados** — para volumes altos, considerar Redis ou coluna desnormalizada com trigger.
- **Fora de escopo nesta entrega:** notificações de novo seguidor, feed baseado em follows, sugestão de "quem seguir", bloqueio de usuários.
