# Profile Followers — Design

- **Data:** 2026-04-19
- **Branch:** `feat/profile-followers`
- **Escopo desta entrega:** Follow assimétrico entre Profiles — follow/unfollow, contadores, listas paginadas e `isFollowing`.
- **Fora desta entrega:** notificações de novo seguidor, feed baseado em follows, sugestão de quem seguir.

---

## 1. Contexto e motivação

O `Profile` já concentra identidade de apresentação (gender, preferences, bio, avatar, galeria). O próximo passo natural para um app de encontros é permitir que usuários sigam uns aos outros — base para feed, descoberta e engajamento social. O modelo assimétrico (estilo Instagram/X) foi escolhido para não exigir aprovação mútua, reduzindo fricção no onboarding.

---

## 2. Decisões

| # | Decisão | Opção escolhida |
|---|---------|----------------|
| 1 | Tipo de follow | Assimétrico — A segue B sem aprovação de B |
| 2 | Armazenamento | Tabela `follows` explícita com PK composta `(follower_id, following_id)` |
| 3 | Contadores | Calculados on-the-fly via `_count` do Prisma (sem desnormalização) |
| 4 | Paginação | Offset-based — `page`/`limit`, consistente com `UsersWithPagination` |
| 5 | API mínima | `followProfile`, `unfollowProfile`, `myFollowers`, `myFollowing`, `isFollowing`, `followersCount`, `followingCount` |
| 6 | Auto-follow | Proibido — `BadRequestException` |
| 7 | Unfollow idempotente | Sim — deletar relação inexistente retorna `true` silenciosamente |
| 8 | Módulo | `src/modules/follow/` novo e independente, importa apenas `PrismaModule` |

---

## 3. Modelo de dados (Prisma)

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

### Notas de design
- **PK composta** `(followerId, followingId)` — único índice necessário para prevenir duplicatas; sem coluna `id` separada.
- **`onDelete: Cascade`** em ambos os lados — deletar um Profile remove todos os seus registros de follow automaticamente.
- **`@@index([followerId])`** — acelera "lista quem eu sigo" e `isFollowing`.
- **`@@index([followingId])`** — acelera "lista quem me segue" e `followersCount`.
- Contadores **não são armazenados** no banco — usam `prisma.follow.count()` para evitar dessincronia.

---

## 4. Arquitetura

Novo módulo `src/modules/follow/`:

```
follow/
├── dto/
│   ├── follow.dto.ts                # @ObjectType FollowDTO
│   └── profiles-with-pagination.dto.ts  # @ObjectType ProfilesWithPagination
├── follow.module.ts
├── follow.service.ts
├── follow.service.spec.ts
├── follow.resolver.ts
└── follow.resolver.spec.ts
```

`FollowResolver` é declarado com `@Resolver(() => ProfileDTO)` para adicionar `@ResolveField` (`followersCount`, `followingCount`) no tipo `Profile` do GraphQL — mesmo padrão do `ProfileResolver`.

---

## 5. API GraphQL

### DTOs

```ts
@ObjectType('Follow')
class FollowDTO {
  @Field(() => ID) followerId: string;
  @Field(() => ID) followingId: string;
  @Field(() => GraphQLISODateTime) createdAt: Date;
}

@ObjectType()
class ProfilesWithPagination {
  @Field(() => [ProfileDTO]) profiles: ProfileDTO[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
  @Field(() => Int) totalPages: number;
}
```

`ProfileDTO` ganha dois campos resolvidos sob demanda (não no banco):
```ts
@Field(() => Int) followersCount: number;
@Field(() => Int) followingCount: number;
```

### Operações

| Operação | Tipo | Argumentos | Retorno | Auth |
|----------|------|-----------|---------|------|
| `followProfile` | Mutation | `profileId: ID!` | `FollowDTO` | `GqlAuthGuard` |
| `unfollowProfile` | Mutation | `profileId: ID!` | `Boolean` | `GqlAuthGuard` |
| `myFollowers` | Query | `page?: Int, limit?: Int` | `ProfilesWithPagination` | `GqlAuthGuard` |
| `myFollowing` | Query | `page?: Int, limit?: Int` | `ProfilesWithPagination` | `GqlAuthGuard` |
| `isFollowing` | Query | `profileId: ID!` | `Boolean` | `GqlAuthGuard` |
| `Profile.followersCount` | ResolveField | — | `Int` | herda |
| `Profile.followingCount` | ResolveField | — | `Int` | herda |

### Exemplo GraphQL

```graphql
mutation {
  followProfile(profileId: "abc123") {
    followerId
    followingId
    createdAt
  }
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

---

## 6. `FollowService` — métodos

| Método | Assinatura | Descrição |
|--------|-----------|-----------|
| `follow` | `(followerUserId, followingProfileId)` | Resolve `followerId` pelo userId; valida auto-follow; cria `Follow` |
| `unfollow` | `(followerUserId, followingProfileId)` | Resolve followerId; deleta relação (no-op se não existir) |
| `getFollowers` | `(profileId, page, limit)` | Lista profiles que me seguem, paginado |
| `getFollowing` | `(profileId, page, limit)` | Lista profiles que eu sigo, paginado |
| `isFollowing` | `(followerUserId, followingProfileId)` | `Boolean` — verifica se relação existe |
| `getFollowersCount` | `(profileId)` | `prisma.follow.count({ where: { followingId: profileId } })` |
| `getFollowingCount` | `(profileId)` | `prisma.follow.count({ where: { followerId: profileId } })` |

---

## 7. Tratamento de erros

| Cenário | Origem | Resposta |
|---------|--------|---------|
| Auto-follow | Service | `BadRequestException: "Você não pode seguir a si mesmo"` |
| Já seguindo | Prisma P2002 | `ConflictException: "Você já segue este perfil"` |
| Unfollow sem relação existente | — | No-op silencioso — retorna `true` |
| `profileId` inexistente | Prisma P2025 | Propagado como `NotFoundException` via filtro global |
| Profile do usuário autenticado não encontrado | Prisma P2025 | Idem |

---

## 8. Testes

### `follow.service.spec.ts`
- `follow` — cria relação; lança `BadRequestException` no auto-follow; propaga P2002 como `ConflictException`
- `unfollow` — deleta relação; no-op quando não existe (deleteMany com count 0)
- `getFollowers` — retorna lista paginada com `total` e `totalPages`
- `getFollowing` — idem
- `isFollowing` — retorna `true` quando existe, `false` quando não existe
- `getFollowersCount` / `getFollowingCount` — delegam ao `prisma.follow.count`

### `follow.resolver.spec.ts`
- `followProfile` — usa `me.id`, repassa `profileId`
- `unfollowProfile` — retorna `true`
- `myFollowers` / `myFollowing` — usam `me.id` como base
- `isFollowing` — usa `me.id`
- `followersCount` / `followingCount` — resolvem pelo `parent.id` do ProfileDTO

---

## 9. Fluxo de trabalho de entrega

1. Branch `feat/profile-followers` criada a partir de `main`
2. Commits atômicos via gitmoji:
   - `:sparkles: feat(prisma): add Follow model`
   - `:sparkles: feat(follow): FollowService (follow, unfollow, getFollowers, getFollowing, isFollowing, counts)`
   - `:sparkles: feat(follow): FollowResolver + DTOs + register in AppModule`
   - `:white_check_mark: test(follow): service + resolver specs`
3. Build limpo + testes passando
4. Push + PR para `main`

---

## 10. Fora de escopo

- Notificações de novo seguidor
- Feed baseado em follows
- Sugestão de "quem seguir"
- Bloqueio de usuários
