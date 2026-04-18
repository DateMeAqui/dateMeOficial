# Auditoria — `upload-medias` e cadeia de mídia (posts / comments / users)

**Data:** 2026-04-18
**Branch:** `audit/upload-medias-review`
**Escopo:** verificar se o fluxo de upload de imagens/vídeos atende os quatro casos de uso declarados:

1. User coloca **avatar** e **fotos de galeria** no próprio perfil
2. User cria **post com foto/imagem**
3. User cria **post com vídeo**
4. User cria **post com múltiplas imagens**
5. User **comenta com imagem/vídeo**

**Metodologia:** leitura dos arquivos-fonte (NestJS 11 + Prisma + Apollo) + cruzamento com documentação oficial do NestJS (`docs.nestjs.com/techniques/file-upload`), Multer 2.x e Apollo Server 4. Context7 MCP não está instalado nesta sessão — os trechos de best-practice abaixo foram validados via WebSearch contra a doc oficial e issues ativas do `nestjs/graphql` (referências no final).

---

## TL;DR — Veredito por caso de uso

| # | Caso de uso | Status | Motivo |
|---|---|---|---|
| 1 | Avatar no perfil | **NÃO FUNCIONA** | Schema `User` não tem campo para avatar; nenhuma mutation/endpoint recebe avatar |
| 1b | Galeria de fotos do perfil | **NÃO FUNCIONA** | Não existe modelo `Photo`/`Gallery`/`UserMedia` no Prisma |
| 2 | Post com 1 imagem | **Parcial — quebra na prática** | `CreatePostInput` aceita `imageUrl: [String]` mas não há integração frontend→upload→post; URL é enviada como string solta |
| 3 | Post com vídeo | **Parcial — mesma restrição** | `videoUrl: String` aceito mas sem fluxo de upload amarrado |
| 4 | Post com múltiplas imagens | **Parcial** | Schema permite (`String[]`); endpoint `/upload-medias/multiple` existe mas está quebrado (ver #3.2) |
| 5 | Comentário com imagem/vídeo | **NÃO FUNCIONA** | Schema `Comment` não tem campos de mídia; DTO é o placeholder scaffold (`exampleField: Int`); `CommentsService` retorna strings, não usa Prisma; `createComment` nem chega a entrar no GraphQL schema |

Dos 5 casos, **0 funcionam de ponta a ponta**. Dois (imagem/vídeo em post) têm metade do caminho: o schema aceita URLs mas não existe nenhum chamador implementado que orquestre upload→persistência atômicamente.

---

## 1. Módulo `upload-medias` — auditoria detalhada

### 1.1 Severidade CRÍTICA

| # | Problema | Arquivo:linha | Evidência |
|---|---|---|---|
| C1 | **Endpoints de upload sem autenticação** | `upload-medias.controller.ts:20–82` | Nenhum `@UseGuards(JwtAuthGuard)` nos `@Post`. Qualquer cliente anônimo consegue gravar arquivo no servidor. |
| C2 | **`FileInterceptor('files')` em endpoint "multiple"** | `upload-medias.controller.ts:57` | `FileInterceptor` (singular) aceita **apenas 1 arquivo** da field. O correto para múltiplos arquivos é `FilesInterceptor('files', maxCount)`. Resultado: o endpoint `/upload-medias/multiple` **processa só o primeiro arquivo**, apesar do nome e do tipo `Express.Multer.File[]`. |
| C3 | **`@UploadedFile()` com tipo array** | `upload-medias.controller.ts:59` | O decorator correto para múltiplos arquivos é `@UploadedFiles()`. Com `@UploadedFile` o parâmetro vem como objeto único — o `files.map()` em `:68` falha em runtime com `TypeError: files.map is not a function`. |
| C4 | **`memoryStorage()` burla a config do `MulterModule`** | `upload-medias.controller.ts:26` vs. `config/multer.config.ts:6` | O módulo registra `diskStorage` com `fileFilter` e `limits.fileSize=50MB` — o controller faz override inline para `memoryStorage()` e **perde o filtro e o limite**. Uploads > 50MB estouram memória do pod. |
| C5 | **Nenhum `ParseFilePipe`** | `upload-medias.controller.ts:28` | Best-practice NestJS 11 é `@UploadedFile(new ParseFilePipe({ validators: [MaxFileSizeValidator, FileTypeValidator] }))`. Validação aqui é um `if` manual no service baseado em `file.mimetype`, que é fornecido pelo cliente e **falsificável** (ataque `Content-Type` forjado). |

### 1.2 Severidade ALTA

| # | Problema | Arquivo:linha | Evidência |
|---|---|---|---|
| A1 | **Armazenamento em disco local, não S3** | `upload-medias.service.ts:10` / `main.ts:11` | `uploadDir = './uploads'`; `app.useStaticAssets(…, '/uploads/')`. Arquivos ficam no filesystem do container; re-deploy apaga tudo. `@aws-sdk/client-s3@^3.890.0` já está no `package.json:26` mas não é importado em nenhum lugar. |
| A2 | **`isVideo` como string enviada pelo cliente** | `upload-medias.service.ts:16,19` | O cliente decide se é vídeo ou imagem via body; `isVideoParam === 'true'`. Deve ser deduzido do `mimetype` do arquivo, não do input do usuário. |
| A3 | **`path.extname` sem sanitização** | `upload-medias.service.ts:22` | `file.originalname.split('.').pop()` aceita qualquer extensão (`jpg.exe`, `../etc/passwd.png`). Uso de `extname()` de `path` + whitelist de extensões resolveria. |
| A4 | **Resolver GraphQL vazio** | `upload-medias.resolver.ts:11–14` | Comentário `GraphQL file upload functionality is temporarily disabled due to graphql-upload package compatibility issues`. O `include` do `GraphQLModule` em `app.module.ts:67` ainda lista `UploadMediasModule`, mas ele não exporta nada útil para o schema. |
| A5 | **Nenhum registro em banco** | `upload-medias.service.ts` | O upload não cria registro de `Media`/`UploadedFile` no Prisma. Sem auditoria, sem referência, sem dono (owner). Arquivo "órfão" no disco. |

### 1.3 Severidade MÉDIA

| # | Problema | Arquivo:linha |
|---|---|---|
| M1 | `console.log('cheguei aqui', …)` em produção | `upload-medias.service.ts:26,62` — logs de debug esquecidos |
| M2 | `console.log(typeof uploadFileDto.isVideo)` | `upload-medias.controller.ts:32` |
| M3 | `BadRequestException('Unsupported image typed.')` — typo | `upload-medias.service.ts:44` |
| M4 | `CreateUploadMediaInput`/`UpdateUploadMediaInput` não usados | `upload-medias.service.ts:2,3` — imports mortos |
| M5 | `UploadMedia` entity com campos não-refletidos no banco (`postId`, `isVideo`) | `entities/upload-media.entity.ts` — entidade fictícia |
| M6 | Sem `Express.Multer.File` sanitização de `originalname` | ataque via filename com `../` |

### 1.4 Severidade BAIXA

| # | Problema |
|---|---|
| B1 | Falta paridade com o `fileFilter` do `multer.config.ts` (ele aceita `image/gif` mas o service aceita só se `isVideo=false`) |
| B2 | `.spec.ts` existem mas não rodam nada útil (herdados do scaffold) |
| B3 | Mensagens de erro em inglês enquanto o resto do projeto está em PT-BR |

---

## 2. Cadeia de mídia nos outros módulos

### 2.1 `posts` — Parcialmente pronto

**Schema** (`prisma/schema.prisma:157–175`):
```prisma
model Post {
  id         String   @id @default(uuid())
  content    String
  imageUrl   String[] @default([])   // suporta N imagens
  videoUrl   String?                  // 1 vídeo
  authorId   String
  …
}
```

**Resolver** (`posts.resolver.ts:14–23`):
```ts
@UseGuards(GqlAuthGuard)
@Mutation(() => Post)
createPost(@Args('createPostInput') input: CreatePostInput, @CurrentUser() user) {
  input.authorId = user.id;
  return this.postsService.create(input);
}
```

**DTO** (`posts/dto/create-post.input.ts`):
```ts
@Field(() => [String], { nullable: true })
@IsString({ each: true })
imageUrl?: string[];

@Field({ nullable: true })
@IsString()
videoUrl?: string;
```

**Avaliação:**
- ✅ Autenticação obrigatória (`GqlAuthGuard`).
- ✅ `authorId` preenchido pelo backend a partir do JWT (não é impersonável).
- ⚠️ **Não há integração com `upload-medias`.** O frontend precisa (1) fazer POST REST em `/upload-medias/single|multiple` para obter URL, (2) copiar URL no corpo da mutation `createPost`. Dois passos não-atômicos — se o cliente faz upload e cai antes de criar o post, arquivo fica órfão no disco.
- ⚠️ `@IsString()` não valida que a URL é `/uploads/<uuid>.<ext>` emitida pelo nosso próprio servidor; um atacante pode colocar `"https://evil.com/malware.exe"` em `imageUrl` — URL é salva na tabela sem validação.
- ⚠️ Sem limite de quantas imagens por post (`@ArrayMaxSize(10)` faria sentido).
- ⚠️ Sem ownership check no delete/update (essa auditoria não cobriu o fluxo completo do post; fica como follow-up).

### 2.2 `comments` — NÃO IMPLEMENTADO

**Schema** (`prisma/schema.prisma:177–196`):
```prisma
model Comment {
  id       String   @id @default(uuid())
  content  String
  authorId String
  postId   String
  parentId String?
  …
}
```
**Sem campo de mídia.**

**Service** (`comments.service.ts`):
```ts
create(input) { return 'This action adds a new comment'; }
findAll() { return `This action returns all comments`; }
```
Todo o service é o scaffold do `nest g resource`. Não toca Prisma.

**Resolver DTO** (`dto/create-comment.input.ts`):
```ts
@Field(() => Int, { description: 'Example field (placeholder)' })
exampleField: number;
```
Ainda o placeholder.

**Schema gerado** (`src/schema.gql`): não contém `createComment`. Embora o módulo esteja importado em `app.module.ts:88`, **não está na lista `include` do `GraphQLModule`** (`app.module.ts:59–69`) — portanto não chega ao schema público.

**Avaliação:** fluxo de comentário **inexistente** em qualquer dimensão (código, schema, banco). Suporte a mídia em comentários exige, no mínimo:
- Campo `Comment.imageUrl String?` e/ou `Comment.videoUrl String?` no Prisma
- Migração
- DTO real substituindo o placeholder
- Service implementado com Prisma
- Adicionar `CommentsModule` ao `include` do `GraphQLModule`
- Guard de auth + derivar `authorId` do `@CurrentUser()`

### 2.3 `users` — Sem suporte a avatar/galeria

**Schema** (`prisma/schema.prisma:17–50`):
```prisma
model User {
  id, fullName, nickName, email, password, smartphone, birthdate, cpf, …
}
```
**Não há avatar, profilePicture, photos[], gallery, ou relacionamento com Photo.**

**Grep** de `avatar|photo|galeria|gallery|profilePicture|profileImage` em `src/modules/users/` → **0 matches**.

**Avaliação:** caso de uso "avatar no perfil" e "galeria de fotos" **não têm nenhum suporte** no código. Precisam:
- Campo `User.avatarUrl String?` (simples) — ou modelo `Photo { id, userId, url, isAvatar, createdAt }` (robusto, permite galeria)
- Migração
- Mutation `updateUserAvatar(url: String!)` (ou `uploadAvatar` integrado)
- Se galeria: mutations `addPhotoToGallery`, `removePhotoFromGallery`, limite por plano

---

## 3. Fluxo end-to-end — por onde o dado trafega hoje

```
┌───────────┐         ┌─────────────────────────────┐         ┌───────────┐
│  cliente  │─(1)────▶│ REST POST /upload-medias/*  │─(disco)▶│ ./uploads │
└───────────┘         └─────────────────────────────┘         └───────────┘
      │                            │
      │                            └─ retorna { fileUrl: "/uploads/<uuid>.jpg" }
      │
      │                         ┌──────────────────────────────┐
      └─(2)─────────GraphQL────▶│ mutation createPost(         │─(Prisma)─▶ posts.imageUrl[]
                                │   content, imageUrl, videoUrl)│
                                └──────────────────────────────┘
```

**Problemas no fluxo:**

1. (1) não exige auth — qualquer um enche o disco.
2. (1) e (2) são desacoplados — não há transação. Upload sem post deixa lixo no disco; post sem upload salva URL inválida.
3. (1) devolve caminho `/uploads/...` servido por `useStaticAssets`. Em ambiente com múltiplas réplicas do pod, **as outras réplicas não têm o arquivo** — CDN/S3 resolveria isso.
4. Não há `Media`/`UploadedFile` table — impossível listar "fotos do user X", "mídia associada ao post Y" sem fazer parse de URL.

---

## 4. Recomendações priorizadas

### Prioridade P0 — bloqueadores de funcionalidade

- **P0.1** Adicionar `@UseGuards(JwtAuthGuard)` nos dois endpoints de `upload-medias`. Derivar `ownerId` do `@CurrentUser()`.
- **P0.2** Corrigir `FileInterceptor` → `FilesInterceptor('files', 10)` + `@UploadedFile` → `@UploadedFiles` em `uploadMultipleFiles`.
- **P0.3** Remover `memoryStorage()` inline do controller — deixar a config global do módulo (ou, se memória for mesmo necessário, aplicar em ambos os endpoints e respeitar `limits`).
- **P0.4** Adicionar campos no Prisma:
  - `User.avatarUrl String?`
  - Modelo `Photo { id, userId, url, createdAt }` com relação 1:N para galeria
  - `Comment.imageUrl String?` + `Comment.videoUrl String?`
- **P0.5** Implementar `CommentsService` com Prisma real e DTO com `content`/`postId`/`parentId`/`imageUrl?`/`videoUrl?`. Incluir `CommentsModule` no `include` do `GraphQLModule`.

### Prioridade P1 — robustez e segurança

- **P1.1** Migrar armazenamento para S3 (SDK já instalado). Implementar `S3StorageService` usando `@aws-sdk/client-s3`. Fallback local apenas em `NODE_ENV=development`.
- **P1.2** Substituir validação manual por `ParseFilePipe` com `FileTypeValidator` (regex mimetype) + `MaxFileSizeValidator`.
- **P1.3** Criar modelo `Media { id, ownerId, url, mimetype, size, sha256, createdAt }` e persistir antes de expor a URL. Mutations de post/comment/user referenciam `mediaId`, não URL crua.
- **P1.4** Validar no `CreatePostInput` / `CreateCommentInput` que as URLs informadas pertencem ao user autenticado (join em `Media`).
- **P1.5** Adicionar `@ArrayMaxSize(10)` em `Post.imageUrl[]` (ou valor de negócio) e tamanho de conteúdo.
- **P1.6** Habilitar `graphql-upload` corretamente (Apollo 4 requer `uploads: false` no `GraphQLModule` + `graphqlUploadExpress` middleware manual) OU assumir a arquitetura 2-passos (REST upload → GraphQL mutate) e **documentar explicitamente** no README do módulo — não deixar comentário "temporariamente desabilitado".

### Prioridade P2 — higiene

- **P2.1** Remover `console.log` de produção, typos ("Unsupported image typed."), imports mortos.
- **P2.2** Remover `@aws-sdk/client-s3` do `package.json` se a decisão for manter disk — ou usá-lo (preferível).
- **P2.3** Escrever testes de integração reais (arquivo mock → upload → verifica persistência → verifica URL servida).
- **P2.4** Padronizar mensagens de erro em PT-BR.

---

## 5. Perguntas em aberto para o time de produto

> ⚠️ **A confirmar:** o microsserviço `src/llm-service` (Python) ou algum worker externo deveria processar vídeo (transcodificação, thumbnail)? Nada disso existe hoje.

> ⚠️ **A confirmar:** há requisito de moderação antes de expor a mídia ao público? O módulo `assistant_ai` consome texto de post via fila — e mídia?

> ⚠️ **A confirmar:** qual o tamanho máximo aceitável para vídeo? O limite atual (50MB no config mas 0MB efetivo por causa do `memoryStorage` bug) é acidental.

> ⚠️ **A confirmar:** plano (FREE/PRO/ULTIMATE) impacta quantidade de fotos de galeria? Se sim, essa regra precisa viver em `plans` e ser consultada na rota de upload.

---

## 6. Referências (validação de best-practices em lugar do Context7)

- [NestJS File Upload docs](https://docs.nestjs.com/techniques/file-upload) — `FilesInterceptor`, `ParseFilePipe`, `MulterModule.register`
- [File Upload Handling — DeepWiki / nestjs/nest](https://deepwiki.com/nestjs/nest/9.3-file-upload-handling) — diferença `memoryStorage` × `diskStorage`
- [Multer 2.x npm](https://www.npmjs.com/package/multer) — API de storage + `limits`
- [Apollo Server 4 + graphql-upload issue](https://github.com/nestjs/graphql/issues/901) — motivo da incompatibilidade citada no resolver
- [graphql-upload@17 npm](https://www.npmjs.com/package/graphql-upload) — configuração atual requerida
- [How to Handle File Uploads in NestJS (2026)](https://oneuptime.com/blog/post/2026-02-02-nestjs-file-uploads/view) — walkthrough atual

---

## 7. Próximos passos sugeridos

1. Revisar este relatório com o time e decidir: manter REST 2-passos (mais simples) ou habilitar GraphQL upload com `graphql-upload@17` (mais limpo mas tem pegadinhas com Apollo 4).
2. Abrir issues separadas para cada item P0 (são bloqueadores para qualquer uso real da feature).
3. Escrever plano de implementação via `superpowers:writing-plans` cobrindo schema migration + refatoração do controller + modelo `Media`.
4. Considerar habilitar CI mínimo que rode `nest build` + `tsc --noEmit` para pegar o bug `FileInterceptor('files')` → `TypeError` antes de prod.
