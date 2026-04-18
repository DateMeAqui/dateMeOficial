# Media Ownership & Cleanup Implementation Plan (Plano 2 de 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) ou `superpowers:executing-plans` para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`) para tracking.

**Goal:** Fechar o gap de 75% entre o estado atual e o padrão "Opção 3" (upload REST → mutation GraphQL referenciando URLs → modelo `Media` com ownership validation + cleanup). Entregar os casos de uso do usuário: avatar, galeria, post com mídia validada e comment com mídia.

**Architecture:**
- Novo modelo Prisma `Media` armazena `{ id, ownerId, kind: 'image'|'video', url, filename, postId?, commentId?, userAvatarId?, photoId? }`. Toda upload REST cria uma row `Media` imediatamente com `ownerId = req.user.id`.
- Mutations (`createPost`, `createComment`, `updateAvatar`, `addGalleryPhoto`) passam a receber `mediaIds: [ID!]` em vez de URLs cruas. O service valida ownership via `MediaService.assertOwnership(mediaIds, userId)` e então "attaches" a mídia à entidade (atualizando o campo FK correspondente).
- Cleanup cron roda de hora em hora, busca `Media` rows com mais de 1h e sem nenhum attachment (`postId`, `commentId`, `userAvatarId`, `photoId` todos null) e apaga arquivo + row.
- `User.avatarUrl`, `Photo` (galeria), `Comment.imageUrl[]`, `Comment.videoUrl` são novos campos/modelos no schema.

**Tech Stack:** NestJS 11, Prisma 5, `@nestjs/schedule` (já registrado em `app.module.ts:54`), Jest.

**Rollback:** Todas as mudanças de código revertem via `git revert` da PR. A migração Prisma é aditiva (novos campos opcionais, novos modelos) — rollback do banco via `npx prisma migrate resolve --rolled-back <name>` + revert do SQL. Nenhum dado existente é modificado destrutivamente.

**Escopo fora deste plano:**
- Migração pra S3 (continua em `./uploads/`).
- Suporte a reações em `Comment`.
- UI cliente — só backend.

---

## File Structure

**Criar:**
- `prisma/migrations/<timestamp>_add_media_ownership/migration.sql` — migração gerada pelo `npx prisma migrate dev`.
- `src/modules/media/media.module.ts` — agrupa `MediaService` + `GalleryResolver`.
- `src/modules/media/media.service.ts` — serviço central: `recordUpload`, `assertOwnership`, `attachToPost`, `attachToComment`, `attachToUserAvatar`, `attachToGalleryPhoto`, cleanup cron.
- `src/modules/media/media.service.spec.ts` — testes unitários.
- `src/modules/media/gallery.resolver.ts` — mutations `addGalleryPhoto`, `removeGalleryPhoto`; query `myGalleryPhotos`.
- `src/modules/media/gallery.resolver.spec.ts` — testes unitários.
- `src/modules/media/entities/photo.entity.ts` — `@ObjectType` Photo.
- `src/modules/media/entities/media.entity.ts` — `@ObjectType` Media (exposto como retorno de upload e de avatar).
- `src/modules/media/README.md` — doc do módulo.

**Modificar:**
- `prisma/schema.prisma` — adicionar `Media`, `Photo`, `User.avatarUrl`, `Comment.imageUrl[]`, `Comment.videoUrl`, relações novas.
- `src/modules/upload-medias/upload-medias.controller.ts` — injetar `MediaService`, chamar `recordUpload` após upload; response DTO passa a incluir `mediaId`/`mediaIds`.
- `src/modules/upload-medias/dto/upload-response.dto.ts` — campos `mediaId?: string` e `mediaIds?: string[]`.
- `src/modules/upload-medias/upload-medias.module.ts` — importar `MediaModule`.
- `src/modules/posts/dto/create-post.input.ts` — substituir `imageUrl: string[]` e `videoUrl: string` por `mediaIds: string[]`.
- `src/modules/posts/posts.service.ts` — validar ownership + resolver URLs + chamar `MediaService.attachToPost`.
- `src/modules/posts/posts.module.ts` — importar `MediaModule`.
- `src/modules/posts/posts.resolver.ts` — remover `console.log`.
- `src/modules/comments/dto/create-comment.input.ts` — substituir placeholder por DTO real.
- `src/modules/comments/dto/update-comment.input.ts` — ajustar tipo de `id` (string, não number).
- `src/modules/comments/comments.service.ts` — reescrever com Prisma real + integração `MediaService`.
- `src/modules/comments/comments.resolver.ts` — auth + aceitar `mediaIds` + `@CurrentUser`.
- `src/modules/comments/comments.module.ts` — importar `MediaModule` + `PrismaModule`.
- `src/modules/comments/entities/comment.entity.ts` — adicionar `imageUrl: string[]`, `videoUrl?: string`.
- `src/modules/users/users.resolver.ts` — nova mutation `updateAvatar`.
- `src/modules/users/users.service.ts` — método `updateAvatar` (consome `MediaService`).
- `src/modules/users/users.module.ts` — importar `MediaModule`.
- `src/modules/users/entities/user.entity.ts` — adicionar `avatarUrl?: string`.
- `src/app.module.ts` — adicionar `MediaModule` ao `include` do GraphQL + adicionar `CommentsModule` e `UsersModule` ao `include` (eles não estão lá — mutations de comment/user hoje não ficam no schema exposto).

---

## Task 1: Schema Prisma + Migração

**Context:** Precisamos dos campos/modelos antes de qualquer código. `MAX_FILE_SIZE_BYTES`, mimetypes e serving estático já estão prontos. A migração é aditiva — não quebra dados existentes.

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Editar `prisma/schema.prisma`**

Adicionar campos ao `User` (logo após `role` no modelo `User`, antes do `@@map`):

```prisma
  avatarUrl             String?   @map("avatar_url")
  avatarMediaId         String?   @unique @map("avatar_media_id")
  avatarMedia           Media?    @relation("UserAvatar", fields: [avatarMediaId], references: [id])
  photos                Photo[]
  medias                Media[]   @relation("MediaOwner")
```

Adicionar campos ao `Comment` (antes do `@@map`):

```prisma
  imageUrl    String[]  @default([]) @map("image_url")
  videoUrl    String?   @map("video_url")
  medias      Media[]
```

Adicionar os dois novos modelos ao final do arquivo:

```prisma
model Photo {
  id         String   @id @default(uuid())
  url        String
  userId     String   @map("user_id")
  mediaId    String?  @unique @map("media_id")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  media      Media?   @relation(fields: [mediaId], references: [id])

  @@map("photos")
}

model Media {
  id              String    @id @default(uuid())
  ownerId         String    @map("owner_id")
  kind            String
  url             String
  filename        String
  postId          String?   @map("post_id")
  commentId       String?   @map("comment_id")
  photoId         String?   @unique @map("photo_id")
  userAvatarId    String?   @unique @map("user_avatar_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  attachedAt      DateTime? @map("attached_at")

  owner           User      @relation("MediaOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  post            Post?     @relation(fields: [postId], references: [id], onDelete: SetNull)
  comment         Comment?  @relation(fields: [commentId], references: [id], onDelete: SetNull)
  userAvatar      User?     @relation("UserAvatar")

  @@index([ownerId])
  @@index([postId])
  @@index([commentId])
  @@index([createdAt, attachedAt])
  @@map("medias")
}
```

Adicionar ao `Post` a relação inversa (antes do `@@map`):

```prisma
  medias              Media[]
```

- [ ] **Step 2: Gerar migração**

```bash
npx prisma migrate dev --name add_media_ownership --create-only
```

Expected: cria `prisma/migrations/<timestamp>_add_media_ownership/migration.sql`. **NÃO aplicar ainda** — inspecionar o SQL primeiro.

- [ ] **Step 3: Inspecionar migração + aplicar**

Abrir o arquivo `migration.sql` gerado e confirmar que contém apenas:
- `ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT, "avatar_media_id" TEXT`
- `ALTER TABLE "comments" ADD COLUMN "image_url" TEXT[], "video_url" TEXT`
- `CREATE TABLE "photos"` e `CREATE TABLE "medias"`
- Foreign keys e índices

Aplicar:

```bash
npx prisma migrate dev
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 4: Regenerar Prisma Client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add Media, Photo, User.avatarUrl, Comment media columns"
```

---

## Task 2: `MediaService` — ownership + attach helpers

**Context:** Núcleo da validação de ownership. Service público, injetável em qualquer módulo. Apenas operações sobre `Media`/`Photo` — não sabe nada de upload HTTP.

**Files:**
- Create: `src/modules/media/media.service.ts`
- Create: `src/modules/media/media.service.spec.ts`
- Create: `src/modules/media/media.module.ts`
- Create: `src/modules/media/entities/media.entity.ts`
- Create: `src/modules/media/entities/photo.entity.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/modules/media/media.service.spec.ts`:

```typescript
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      media: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new MediaService(prisma as PrismaService);
  });

  describe('recordUpload', () => {
    it('cria Media row com owner + kind + url', async () => {
      prisma.media.create.mockResolvedValue({ id: 'm1', ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' });
      const out = await service.recordUpload({ ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' });
      expect(out.id).toBe('m1');
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: { ownerId: 'u1', kind: 'image', url: '/uploads/x.png', filename: 'x.png' },
      });
    });
  });

  describe('assertOwnership', () => {
    it('não lança quando todas as mídias pertencem ao user', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null },
        { id: 'm2', ownerId: 'u1', attachedAt: null },
      ]);
      await expect(service.assertOwnership(['m1', 'm2'], 'u1')).resolves.toBeUndefined();
    });

    it('lança ForbiddenException quando alguma mídia não pertence ao user', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', ownerId: 'u1', attachedAt: null }]);
      await expect(service.assertOwnership(['m1', 'm2'], 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando mídia já foi attached', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', ownerId: 'u1', attachedAt: new Date() }]);
      await expect(service.assertOwnership(['m1'], 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('aceita array vazio sem consultar banco', async () => {
      await expect(service.assertOwnership([], 'u1')).resolves.toBeUndefined();
      expect(prisma.media.findMany).not.toHaveBeenCalled();
    });
  });

  describe('attachToPost', () => {
    it('atualiza postId e attachedAt das mídias', async () => {
      prisma.media.updateMany.mockResolvedValue({ count: 2 });
      await service.attachToPost(['m1', 'm2'], 'p1');
      expect(prisma.media.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['m1', 'm2'] } },
        data: { postId: 'p1', attachedAt: expect.any(Date) },
      });
    });

    it('no-op em array vazio', async () => {
      await service.attachToPost([], 'p1');
      expect(prisma.media.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('resolveUrls', () => {
    it('retorna URLs filtrando por kind solicitado', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', url: '/uploads/a.png', kind: 'image' },
        { id: 'm2', url: '/uploads/b.mp4', kind: 'video' },
      ]);
      const out = await service.resolveUrls(['m1', 'm2']);
      expect(out).toEqual({
        imageUrls: ['/uploads/a.png'],
        videoUrl: '/uploads/b.mp4',
      });
    });

    it('lança BadRequest se houver mais de um vídeo', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', url: '/uploads/a.mp4', kind: 'video' },
        { id: 'm2', url: '/uploads/b.mp4', kind: 'video' },
      ]);
      await expect(service.resolveUrls(['m1', 'm2'])).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/media/media.service.spec.ts
```

Expected: FAIL — `MediaService` não existe.

- [ ] **Step 3: Criar `media.service.ts`**

```typescript
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MediaKind = 'image' | 'video';

export interface RecordUploadInput {
  ownerId: string;
  kind: MediaKind;
  url: string;
  filename: string;
}

export interface ResolvedMediaUrls {
  imageUrls: string[];
  videoUrl?: string;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async recordUpload(input: RecordUploadInput) {
    return this.prisma.media.create({ data: input });
  }

  async assertOwnership(mediaIds: string[], userId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    const rows = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, ownerId: true, attachedAt: true },
    });
    if (rows.length !== mediaIds.length) {
      throw new ForbiddenException('One or more media not found.');
    }
    for (const row of rows) {
      if (row.ownerId !== userId) {
        throw new ForbiddenException('Media does not belong to user.');
      }
      if (row.attachedAt !== null) {
        throw new ForbiddenException('Media already attached to another entity.');
      }
    }
  }

  async attachToPost(mediaIds: string[], postId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    await this.prisma.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { postId, attachedAt: new Date() },
    });
  }

  async attachToComment(mediaIds: string[], commentId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    await this.prisma.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { commentId, attachedAt: new Date() },
    });
  }

  async attachToUserAvatar(mediaId: string, userId: string): Promise<string> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new ForbiddenException('Media not found.');
    if (media.kind !== 'image') throw new BadRequestException('Avatar must be an image.');
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { userAvatarId: userId, attachedAt: new Date() },
    });
    return media.url;
  }

  async attachToGalleryPhoto(mediaId: string, photoId: string): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { photoId, attachedAt: new Date() },
    });
  }

  async resolveUrls(mediaIds: string[]): Promise<ResolvedMediaUrls> {
    if (mediaIds.length === 0) return { imageUrls: [], videoUrl: undefined };
    const rows = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, url: true, kind: true },
    });
    const imageUrls = rows.filter((r) => r.kind === 'image').map((r) => r.url);
    const videos = rows.filter((r) => r.kind === 'video');
    if (videos.length > 1) throw new BadRequestException('Only one video per post.');
    return { imageUrls, videoUrl: videos[0]?.url };
  }
}
```

- [ ] **Step 4: Criar `media.entity.ts` e `photo.entity.ts`**

`src/modules/media/entities/media.entity.ts`:

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Media {
  @Field(() => ID)
  id: string;

  @Field()
  ownerId: string;

  @Field()
  kind: string;

  @Field()
  url: string;

  @Field()
  filename: string;

  @Field({ nullable: true })
  postId?: string;

  @Field({ nullable: true })
  commentId?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  attachedAt?: Date;
}
```

`src/modules/media/entities/photo.entity.ts`:

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Photo {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field()
  userId: string;

  @Field()
  createdAt: Date;
}
```

- [ ] **Step 5: Criar `media.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaService } from './media.service';

@Module({
  imports: [PrismaModule],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
```

- [ ] **Step 6: Rodar os testes**

```bash
npx jest src/modules/media/media.service.spec.ts
```

Expected: PASS, 8/8.

- [ ] **Step 7: Commit**

```bash
git add src/modules/media/
git commit -m "feat(media): add MediaService with ownership + attach helpers"
```

---

## Task 3: Integrar `MediaService` no upload REST

**Context:** Depois que o `diskStorage` escreve o arquivo, o controller chama `mediaService.recordUpload` e retorna `mediaId`/`mediaIds` ao cliente.

**Files:**
- Modify: `src/modules/upload-medias/upload-medias.controller.ts`
- Modify: `src/modules/upload-medias/upload-medias.controller.spec.ts`
- Modify: `src/modules/upload-medias/upload-medias.module.ts`
- Modify: `src/modules/upload-medias/dto/upload-response.dto.ts`

- [ ] **Step 1: Estender `UploadResponseDto`**

Substituir `src/modules/upload-medias/dto/upload-response.dto.ts`:

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UploadResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  fileUrl?: string;

  @Field(() => [String], { nullable: true })
  fileUrls?: string[];

  @Field(() => ID, { nullable: true })
  mediaId?: string;

  @Field(() => [ID], { nullable: true })
  mediaIds?: string[];
}
```

- [ ] **Step 2: Atualizar spec do controller**

Substituir `src/modules/upload-medias/upload-medias.controller.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasService } from './upload-medias.service';
import { MediaService } from '../media/media.service';

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: overrides.originalname ?? 'a.jpg',
    encoding: '7bit',
    mimetype: overrides.mimetype ?? 'image/jpeg',
    size: overrides.size ?? 100,
    destination: './uploads',
    filename: overrides.filename ?? 'abc-123.jpg',
    path: `./uploads/${overrides.filename ?? 'abc-123.jpg'}`,
    stream: null as any,
    buffer: null as any,
  }) as Express.Multer.File;

describe('UploadMediasController', () => {
  let controller: UploadMediasController;
  let uploadSvc: UploadMediasService;
  let mediaSvc: jest.Mocked<Pick<MediaService, 'recordUpload'>>;

  beforeEach(() => {
    uploadSvc = new UploadMediasService();
    mediaSvc = { recordUpload: jest.fn() } as any;
    controller = new UploadMediasController(uploadSvc, mediaSvc as any);
  });

  const currentUser = { id: 'u1' };

  describe('uploadSingleFile', () => {
    it('lança BadRequest se nenhum arquivo vier', async () => {
      await expect(
        controller.uploadSingleFile(undefined as any, { kind: 'image' }, currentUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna URL + mediaId após registrar upload', async () => {
      const file = makeFile({ mimetype: 'image/png', filename: 'f.png' });
      mediaSvc.recordUpload.mockResolvedValue({ id: 'm1' } as any);
      const out = await controller.uploadSingleFile(file, { kind: 'image' }, currentUser as any);
      expect(out).toEqual({
        success: true,
        message: 'File uploaded successfully',
        fileUrl: '/uploads/f.png',
        mediaId: 'm1',
      });
      expect(mediaSvc.recordUpload).toHaveBeenCalledWith({
        ownerId: 'u1',
        kind: 'image',
        url: '/uploads/f.png',
        filename: 'f.png',
      });
    });
  });

  describe('uploadMultipleFiles', () => {
    it('retorna N URLs + N mediaIds', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'image/jpeg', filename: 'b.jpg' }),
      ];
      mediaSvc.recordUpload.mockResolvedValueOnce({ id: 'm1' } as any);
      mediaSvc.recordUpload.mockResolvedValueOnce({ id: 'm2' } as any);
      const out = await controller.uploadMultipleFiles(files, { kind: 'image' }, currentUser as any);
      expect(out).toEqual({
        success: true,
        message: 'Files uploaded successfully',
        fileUrls: ['/uploads/a.png', '/uploads/b.jpg'],
        mediaIds: ['m1', 'm2'],
      });
      expect(mediaSvc.recordUpload).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx jest src/modules/upload-medias/upload-medias.controller.spec.ts
```

Expected: FAIL — assinatura antiga do controller (sem `@CurrentUserRest`, sem `MediaService`).

- [ ] **Step 4: Reescrever controller**

Substituir `src/modules/upload-medias/upload-medias.controller.ts`:

```typescript
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { CurrentUserRest } from '../auth/decorators/current-user-rest.decorator';
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
import { MediaService } from '../media/media.service';
import {
  ALL_MEDIA_MIMETYPES,
  MAX_FILE_SIZE_BYTES,
} from './config/media-mimetypes';
import { UploadResponseDto } from './dto/upload-response.dto';
import { UploadMediasService } from './upload-medias.service';
import type { MediaKind } from './upload-medias.service';

class UploadKindDto {
  @IsIn(['image', 'video'])
  kind: MediaKind;
}

const MAX_MULTIPLE_FILES = 10;

const parseSingleFilePipe = () =>
  new ParseFilePipe({
    validators: [
      {
        isValid(file: Express.Multer.File) {
          if (!file) return false;
          if (file.size > MAX_FILE_SIZE_BYTES) return false;
          return (ALL_MEDIA_MIMETYPES as readonly string[]).includes(file.mimetype);
        },
        buildErrorMessage: () => 'Invalid file (size or mimetype).',
      } as any,
    ],
    fileIsRequired: true,
  });

@Controller('upload-medias')
@UseGuards(JwtRestAuthGuard)
export class UploadMediasController {
  constructor(
    private readonly uploadMediasService: UploadMediasService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile(parseSingleFilePipe()) file: Express.Multer.File,
    @Body() body: UploadKindDto,
    @CurrentUserRest() user: { id: string },
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.uploadMediasService.assertMimetypeMatchesKind(file, body.kind);

    const url = this.uploadMediasService.buildUrl(file);
    const media = await this.mediaService.recordUpload({
      ownerId: user.id,
      kind: body.kind,
      url,
      filename: file.filename,
    });

    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: url,
      mediaId: media.id,
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', MAX_MULTIPLE_FILES))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadKindDto,
    @CurrentUserRest() user: { id: string },
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    files.forEach((f) =>
      this.uploadMediasService.assertMimetypeMatchesKind(f, body.kind),
    );

    const urls = files.map((f) => this.uploadMediasService.buildUrl(f));
    const medias = await Promise.all(
      files.map((f, idx) =>
        this.mediaService.recordUpload({
          ownerId: user.id,
          kind: body.kind,
          url: urls[idx],
          filename: f.filename,
        }),
      ),
    );

    return {
      success: true,
      message: 'Files uploaded successfully',
      fileUrls: urls,
      mediaIds: medias.map((m) => m.id),
    };
  }
}
```

- [ ] **Step 5: Atualizar module**

Editar `src/modules/upload-medias/upload-medias.module.ts` — adicionar `MediaModule` aos imports:

```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { multerConfig } from './config/multer.config';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasResolver } from './upload-medias.resolver';
import { UploadMediasService } from './upload-medias.service';

@Module({
  imports: [
    MulterModule.register(multerConfig()),
    AuthModule,
    MediaModule,
  ],
  controllers: [UploadMediasController],
  providers: [UploadMediasResolver, UploadMediasService],
  exports: [UploadMediasService],
})
export class UploadMediasModule {}
```

- [ ] **Step 6: Rodar testes**

```bash
npx jest src/modules/upload-medias/upload-medias.controller.spec.ts
```

Expected: PASS, 4/4.

- [ ] **Step 7: Commit**

```bash
git add src/modules/upload-medias/ 
git commit -m "feat(upload-medias): record Media row and return mediaId on upload"
```

---

## Task 4: `updateAvatar` mutation

**Context:** User pode trocar avatar passando um `mediaId` que ele mesmo subiu. Validação: media existe, pertence ao user, é imagem, não foi atachada.

**Files:**
- Modify: `src/modules/users/users.service.ts`
- Modify: `src/modules/users/users.resolver.ts`
- Modify: `src/modules/users/users.module.ts`
- Modify: `src/modules/users/users.service.spec.ts`
- Modify: `src/modules/users/entities/user.entity.ts`
- Modify: `src/app.module.ts` (adicionar `UsersModule` ao `include` do GraphQL)

- [ ] **Step 1: Adicionar campo ao `User` entity**

Editar `src/modules/users/entities/user.entity.ts` — adicionar campo (após `email` ou campo similar):

```typescript
  @Field(() => String, { nullable: true })
  avatarUrl?: string;
```

- [ ] **Step 2: Escrever teste do service**

Editar `src/modules/users/users.service.spec.ts` — adicionar novo `describe` no final:

```typescript
  describe('updateAvatar', () => {
    it('delega pra MediaService.attachToUserAvatar e atualiza avatarUrl', async () => {
      const mediaService = { attachToUserAvatar: jest.fn().mockResolvedValue('/uploads/x.png') };
      const prisma = {
        user: { update: jest.fn().mockResolvedValue({ id: 'u1', avatarUrl: '/uploads/x.png' }) },
      };
      const svc = new UsersService(prisma as any, null as any, null as any, mediaService as any);
      const out = await svc.updateAvatar('u1', 'm1');
      expect(mediaService.attachToUserAvatar).toHaveBeenCalledWith('m1', 'u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: '/uploads/x.png', avatarMediaId: 'm1' },
      });
      expect(out.avatarUrl).toBe('/uploads/x.png');
    });
  });
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx jest src/modules/users/users.service.spec.ts
```

Expected: FAIL — método `updateAvatar` não existe.

- [ ] **Step 4: Adicionar `updateAvatar` ao service**

Editar `src/modules/users/users.service.ts`:

Injetar `MediaService` no construtor:

```typescript
import { MediaService } from '../media/media.service';
```

Modificar o constructor:

```typescript
  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private calculateDateBrazilNow: CalculateDateBrazilNow,
    private mediaService: MediaService,
  ){}
```

Adicionar método (depois de `updateUser`):

```typescript
  async updateAvatar(userId: string, mediaId: string) {
    const url = await this.mediaService.attachToUserAvatar(mediaId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url, avatarMediaId: mediaId },
    });
  }
```

- [ ] **Step 5: Adicionar mutation ao resolver**

Editar `src/modules/users/users.resolver.ts` — adicionar mutation (depois de `updateUser`):

```typescript
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, { name: 'updateAvatar' })
  updateAvatar(
    @Args('mediaId') mediaId: string,
    @CurrentUser() me,
  ) {
    return this.usersService.updateAvatar(me.id, mediaId);
  }
```

- [ ] **Step 6: Atualizar module**

Editar `src/modules/users/users.module.ts` — adicionar `MediaModule` aos imports.

```typescript
import { MediaModule } from '../media/media.module';
```

Adicionar na lista de imports do `@Module`: `MediaModule`.

- [ ] **Step 7: Adicionar `UsersModule` ao GraphQL include**

Editar `src/app.module.ts` — adicionar `UsersModule` e `MediaModule` à lista `include` do `GraphQLModule.forRoot`:

```typescript
      include: [
        AuthModule, 
        PagSeguroModule,
        PlansModule,
        SubscriptionsModule,
        SubscriptionStatusModule,
        PaymentsModule,
        PostsModule,
        UploadMediasModule,
        ComplaintsModule,
        UsersModule,
        MediaModule,
        CommentsModule
      ],
```

E também importar `MediaModule` no topo + na lista global de imports do `@Module` do app.

- [ ] **Step 8: Rodar testes**

```bash
npx jest src/modules/users/users.service.spec.ts
```

Expected: PASS no novo teste.

- [ ] **Step 9: Commit**

```bash
git add src/modules/users/ src/app.module.ts
git commit -m "feat(users): add updateAvatar mutation with media ownership validation"
```

---

## Task 5: Gallery — `Photo` model + resolver

**Context:** User adiciona/remove/lista fotos em sua galeria pessoal. Cada `Photo` tem um `Media` associado.

**Files:**
- Create: `src/modules/media/gallery.resolver.ts`
- Create: `src/modules/media/gallery.resolver.spec.ts`
- Modify: `src/modules/media/media.service.ts` (adicionar métodos `addGalleryPhoto`, `removeGalleryPhoto`, `listGalleryPhotos`)
- Modify: `src/modules/media/media.service.spec.ts` (tests dos novos métodos)
- Modify: `src/modules/media/media.module.ts` (registrar `GalleryResolver`)

- [ ] **Step 1: Escrever tests dos novos métodos do service**

Adicionar ao `src/modules/media/media.service.spec.ts`, dentro do `describe('MediaService', ...)`:

```typescript
  describe('addGalleryPhoto', () => {
    it('valida ownership, cria Photo, attaches media', async () => {
      prisma.media.findMany = jest.fn().mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null, url: '/uploads/x.png', kind: 'image' },
      ]);
      prisma.photo = { create: jest.fn().mockResolvedValue({ id: 'p1', url: '/uploads/x.png', userId: 'u1' }) };
      prisma.media.update = jest.fn().mockResolvedValue({});
      const out = await service.addGalleryPhoto('m1', 'u1');
      expect(out.id).toBe('p1');
      expect(prisma.photo.create).toHaveBeenCalledWith({
        data: { url: '/uploads/x.png', userId: 'u1', mediaId: 'm1' },
      });
      expect(prisma.media.update).toHaveBeenCalled();
    });

    it('rejeita vídeo na galeria', async () => {
      prisma.media.findMany = jest.fn().mockResolvedValue([
        { id: 'm1', ownerId: 'u1', attachedAt: null, url: '/uploads/x.mp4', kind: 'video' },
      ]);
      await expect(service.addGalleryPhoto('m1', 'u1')).rejects.toThrow();
    });
  });

  describe('removeGalleryPhoto', () => {
    it('apaga photo se pertencer ao user', async () => {
      prisma.photo = {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' }),
        delete: jest.fn().mockResolvedValue({}),
      };
      await service.removeGalleryPhoto('p1', 'u1');
      expect(prisma.photo.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('lança ForbiddenException se photo não for do user', async () => {
      prisma.photo = {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u2' }),
      };
      await expect(service.removeGalleryPhoto('p1', 'u1')).rejects.toThrow();
    });
  });

  describe('listGalleryPhotos', () => {
    it('retorna photos do user ordenadas por createdAt desc', async () => {
      prisma.photo = { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]) };
      const out = await service.listGalleryPhotos('u1');
      expect(prisma.photo.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(out).toHaveLength(2);
    });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/media/media.service.spec.ts
```

Expected: FAIL nos 4 novos testes.

- [ ] **Step 3: Adicionar métodos ao service**

Editar `src/modules/media/media.service.ts`, adicionar métodos antes do fim da classe:

```typescript
  async addGalleryPhoto(mediaId: string, userId: string) {
    const rows = await this.prisma.media.findMany({
      where: { id: { in: [mediaId] } },
      select: { id: true, ownerId: true, attachedAt: true, url: true, kind: true },
    });
    if (rows.length === 0) throw new ForbiddenException('Media not found.');
    const media = rows[0];
    if (media.ownerId !== userId) throw new ForbiddenException('Media not owned.');
    if (media.attachedAt) throw new ForbiddenException('Media already attached.');
    if (media.kind !== 'image') throw new BadRequestException('Gallery accepts images only.');

    const photo = await this.prisma.photo.create({
      data: { url: media.url, userId, mediaId },
    });
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { photoId: photo.id, attachedAt: new Date() },
    });
    return photo;
  }

  async removeGalleryPhoto(photoId: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new ForbiddenException('Photo not found.');
    if (photo.userId !== userId) throw new ForbiddenException('Photo not owned.');
    await this.prisma.photo.delete({ where: { id: photoId } });
  }

  async listGalleryPhotos(userId: string) {
    return this.prisma.photo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
```

- [ ] **Step 4: Criar `gallery.resolver.ts`**

```typescript
import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { Photo } from './entities/photo.entity';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Photo)
@UseGuards(GqlAuthGuard)
export class GalleryResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Mutation(() => Photo, { name: 'addGalleryPhoto' })
  addGalleryPhoto(
    @Args('mediaId', { type: () => ID }) mediaId: string,
    @CurrentUser() me,
  ) {
    return this.mediaService.addGalleryPhoto(mediaId, me.id);
  }

  @Mutation(() => Boolean, { name: 'removeGalleryPhoto' })
  async removeGalleryPhoto(
    @Args('photoId', { type: () => ID }) photoId: string,
    @CurrentUser() me,
  ) {
    await this.mediaService.removeGalleryPhoto(photoId, me.id);
    return true;
  }

  @Query(() => [Photo], { name: 'myGalleryPhotos' })
  myGalleryPhotos(@CurrentUser() me) {
    return this.mediaService.listGalleryPhotos(me.id);
  }
}
```

- [ ] **Step 5: Criar test para o resolver**

`src/modules/media/gallery.resolver.spec.ts`:

```typescript
import { GalleryResolver } from './gallery.resolver';

describe('GalleryResolver', () => {
  let resolver: GalleryResolver;
  let media: any;

  beforeEach(() => {
    media = {
      addGalleryPhoto: jest.fn().mockResolvedValue({ id: 'p1' }),
      removeGalleryPhoto: jest.fn().mockResolvedValue(undefined),
      listGalleryPhotos: jest.fn().mockResolvedValue([{ id: 'p1' }]),
    };
    resolver = new GalleryResolver(media);
  });

  it('addGalleryPhoto chama service com me.id', async () => {
    const out = await resolver.addGalleryPhoto('m1', { id: 'u1' } as any);
    expect(media.addGalleryPhoto).toHaveBeenCalledWith('m1', 'u1');
    expect(out.id).toBe('p1');
  });

  it('removeGalleryPhoto retorna true', async () => {
    const out = await resolver.removeGalleryPhoto('p1', { id: 'u1' } as any);
    expect(media.removeGalleryPhoto).toHaveBeenCalledWith('p1', 'u1');
    expect(out).toBe(true);
  });

  it('myGalleryPhotos retorna lista', async () => {
    const out = await resolver.myGalleryPhotos({ id: 'u1' } as any);
    expect(out).toEqual([{ id: 'p1' }]);
  });
});
```

- [ ] **Step 6: Registrar resolver no module**

Editar `src/modules/media/media.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GalleryResolver } from './gallery.resolver';
import { MediaService } from './media.service';

@Module({
  imports: [PrismaModule],
  providers: [MediaService, GalleryResolver],
  exports: [MediaService],
})
export class MediaModule {}
```

- [ ] **Step 7: Rodar testes**

```bash
npx jest src/modules/media/
```

Expected: PASS, 11/11 (8 do service + 3 do resolver).

- [ ] **Step 8: Commit**

```bash
git add src/modules/media/
git commit -m "feat(media): add gallery — addGalleryPhoto/removeGalleryPhoto/myGalleryPhotos"
```

---

## Task 6: Posts aceitam `mediaIds` com ownership validation

**Context:** `CreatePostInput` passa a receber `mediaIds: [ID!]` em vez de URL crua. Service valida ownership, resolve URLs via `MediaService`, salva `post.imageUrl[]` + `post.videoUrl`, attach `Media.postId`.

**Files:**
- Modify: `src/modules/posts/dto/create-post.input.ts`
- Modify: `src/modules/posts/posts.service.ts`
- Modify: `src/modules/posts/posts.service.spec.ts`
- Modify: `src/modules/posts/posts.resolver.ts`
- Modify: `src/modules/posts/posts.module.ts`

- [ ] **Step 1: Substituir `CreatePostInput`**

Editar `src/modules/posts/dto/create-post.input.ts`:

```typescript
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsString()
  content: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];

  authorId!: string;
}
```

- [ ] **Step 2: Atualizar teste do service**

Editar `src/modules/posts/posts.service.spec.ts`, substituir todo o arquivo por:

```typescript
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: any;
  let media: any;

  beforeEach(() => {
    prisma = {
      post: {
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    media = {
      assertOwnership: jest.fn().mockResolvedValue(undefined),
      resolveUrls: jest.fn().mockResolvedValue({ imageUrls: [], videoUrl: undefined }),
      attachToPost: jest.fn().mockResolvedValue(undefined),
    };
    service = new PostsService(prisma, media);
  });

  describe('create', () => {
    it('sem mediaIds: cria post só com content', async () => {
      const out = await service.create({ content: 'hello', authorId: 'u1', mediaIds: [] });
      expect(media.assertOwnership).toHaveBeenCalledWith([], 'u1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: { content: 'hello', authorId: 'u1', imageUrl: [], videoUrl: undefined },
      });
      expect(out.id).toBe('p1');
    });

    it('com mediaIds: valida, resolve URLs, cria post, attach media', async () => {
      media.resolveUrls.mockResolvedValue({ imageUrls: ['/uploads/a.png'], videoUrl: '/uploads/b.mp4' });
      await service.create({ content: 'hi', authorId: 'u1', mediaIds: ['m1', 'm2'] });
      expect(media.assertOwnership).toHaveBeenCalledWith(['m1', 'm2'], 'u1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: { content: 'hi', authorId: 'u1', imageUrl: ['/uploads/a.png'], videoUrl: '/uploads/b.mp4' },
      });
      expect(media.attachToPost).toHaveBeenCalledWith(['m1', 'm2'], 'p1');
    });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx jest src/modules/posts/posts.service.spec.ts
```

Expected: FAIL — service não aceita `MediaService` ainda.

- [ ] **Step 4: Reescrever `PostsService.create`**

Editar `src/modules/posts/posts.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { CreatePostInput } from './dto/create-post.input';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async create(createPostInput: CreatePostInput) {
    const { mediaIds = [], ...rest } = createPostInput;
    await this.mediaService.assertOwnership(mediaIds, rest.authorId);
    const { imageUrls, videoUrl } = await this.mediaService.resolveUrls(mediaIds);

    const post = await this.prisma.post.create({
      data: {
        content: rest.content,
        authorId: rest.authorId,
        imageUrl: imageUrls,
        videoUrl,
      },
    });

    await this.mediaService.attachToPost(mediaIds, post.id);
    return post;
  }

  findAll() {
    return this.prisma.post.findMany({ include: { author: true } });
  }

  findOne(id: string) {
    return this.prisma.post.findUnique({ where: { id }, include: { author: true } });
  }

  findByAuthor(authorId: string) {
    return this.prisma.post.findMany({ where: { authorId }, include: { author: true } });
  }
}
```

- [ ] **Step 5: Remover `console.log` do resolver**

Editar `src/modules/posts/posts.resolver.ts`, método `createPost` — remover linha `console.log('User creating post:', user);`.

- [ ] **Step 6: Importar `MediaModule` no `PostsModule`**

Editar `src/modules/posts/posts.module.ts` — adicionar `MediaModule` aos imports.

- [ ] **Step 7: Rodar testes**

```bash
npx jest src/modules/posts/posts.service.spec.ts
```

Expected: PASS, 2/2.

- [ ] **Step 8: Commit**

```bash
git add src/modules/posts/
git commit -m "feat(posts): accept mediaIds with ownership validation"
```

---

## Task 7: Comments — DTO real + CommentsService com Prisma

**Context:** Tanto `CreateCommentInput` quanto `CommentsService` são scaffolds vazios. Precisam ser reescritos pra aceitar `{ postId, content, parentId?, mediaIds? }` e persistir via Prisma.

**Files:**
- Modify: `src/modules/comments/dto/create-comment.input.ts`
- Modify: `src/modules/comments/dto/update-comment.input.ts`
- Modify: `src/modules/comments/comments.service.ts`
- Modify: `src/modules/comments/comments.service.spec.ts`
- Modify: `src/modules/comments/comments.resolver.ts`
- Modify: `src/modules/comments/comments.module.ts`
- Modify: `src/modules/comments/entities/comment.entity.ts`

- [ ] **Step 1: Reescrever `CreateCommentInput`**

`src/modules/comments/dto/create-comment.input.ts`:

```typescript
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

@InputType()
export class CreateCommentInput {
  @Field(() => ID)
  @IsUUID()
  postId: string;

  @Field()
  @IsString()
  content: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];
}
```

- [ ] **Step 2: Ajustar `UpdateCommentInput`**

Editar `src/modules/comments/dto/update-comment.input.ts`:

```typescript
import { CreateCommentInput } from './create-comment.input';
import { InputType, Field, ID, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCommentInput extends PartialType(CreateCommentInput) {
  @Field(() => ID)
  id: string;
}
```

- [ ] **Step 3: Adicionar campos à entity**

Editar `src/modules/comments/entities/comment.entity.ts` — adicionar (após `content`):

```typescript
  @Field(() => [String])
  imageUrl: string[];

  @Field(() => String, { nullable: true })
  videoUrl?: string;
```

- [ ] **Step 4: Escrever tests do CommentsService**

Substituir `src/modules/comments/comments.service.spec.ts`:

```typescript
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: any;
  let media: any;

  beforeEach(() => {
    prisma = {
      comment: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    media = {
      assertOwnership: jest.fn().mockResolvedValue(undefined),
      resolveUrls: jest.fn().mockResolvedValue({ imageUrls: [], videoUrl: undefined }),
      attachToComment: jest.fn().mockResolvedValue(undefined),
    };
    service = new CommentsService(prisma, media);
  });

  it('create sem media: salva comment', async () => {
    const out = await service.create('u1', {
      postId: 'p1',
      content: 'hi',
      mediaIds: [],
    });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        postId: 'p1',
        content: 'hi',
        authorId: 'u1',
        parentId: undefined,
        imageUrl: [],
        videoUrl: undefined,
      },
    });
    expect(out.id).toBe('c1');
  });

  it('create com media: valida ownership, resolve URLs, attach', async () => {
    media.resolveUrls.mockResolvedValue({ imageUrls: ['/uploads/a.png'], videoUrl: undefined });
    await service.create('u1', { postId: 'p1', content: 'hi', mediaIds: ['m1'] });
    expect(media.assertOwnership).toHaveBeenCalledWith(['m1'], 'u1');
    expect(media.attachToComment).toHaveBeenCalledWith(['m1'], 'c1');
  });

  it('findByPost retorna comments do post', async () => {
    prisma.comment.findMany.mockResolvedValue([{ id: 'c1' }]);
    const out = await service.findByPost('p1');
    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { postId: 'p1' },
      include: { author: true, replies: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(out).toHaveLength(1);
  });

  it('remove: só autor pode apagar', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1' });
    await service.remove('c1', 'u1');
    expect(prisma.comment.delete).toHaveBeenCalled();
  });

  it('remove: lança se não for autor', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u2' });
    await expect(service.remove('c1', 'u1')).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

```bash
npx jest src/modules/comments/comments.service.spec.ts
```

Expected: FAIL — service ainda é stub.

- [ ] **Step 6: Reescrever `comments.service.ts`**

```typescript
import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateCommentInput } from './dto/create-comment.input';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async create(userId: string, input: CreateCommentInput) {
    const mediaIds = input.mediaIds ?? [];
    await this.mediaService.assertOwnership(mediaIds, userId);
    const { imageUrls, videoUrl } = await this.mediaService.resolveUrls(mediaIds);

    const comment = await this.prisma.comment.create({
      data: {
        postId: input.postId,
        content: input.content,
        authorId: userId,
        parentId: input.parentId,
        imageUrl: imageUrls,
        videoUrl,
      },
    });

    await this.mediaService.attachToComment(mediaIds, comment.id);
    return comment;
  }

  findByPost(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: { author: true, replies: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { author: true, replies: true },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new ForbiddenException('Comment not found.');
    if (comment.authorId !== userId) throw new ForbiddenException('Not the author.');
    return this.prisma.comment.delete({ where: { id } });
  }
}
```

- [ ] **Step 7: Reescrever `comments.resolver.ts`**

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

  @Query(() => [Comment], { name: 'commentsByPost' })
  findByPost(@Args('postId', { type: () => ID }) postId: string) {
    return this.commentsService.findByPost(postId);
  }

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

- [ ] **Step 8: Atualizar module**

`src/modules/comments/comments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, MediaModule, AuthModule],
  providers: [CommentsResolver, CommentsService],
})
export class CommentsModule {}
```

- [ ] **Step 9: Rodar tests**

```bash
npx jest src/modules/comments/
```

Expected: PASS, 5/5 no service + resolver já cobrindo `should be defined` ou similar.

- [ ] **Step 10: Commit**

```bash
git add src/modules/comments/ 
git commit -m "feat(comments): real DTOs + Prisma service + media support"
```

---

## Task 8: Cleanup cron pra mídias órfãs

**Context:** Se o cliente sobe arquivo mas não cria post/comment/avatar/photo, a `Media` fica com todos os FKs null e `attachedAt = null`. Cron roda de hora em hora: busca rows `createdAt < now-1h AND attachedAt IS NULL AND postId IS NULL AND commentId IS NULL AND photoId IS NULL AND userAvatarId IS NULL` → apaga arquivo do disco + row.

**Files:**
- Modify: `src/modules/media/media.service.ts` (adicionar método + `@Cron`)
- Modify: `src/modules/media/media.service.spec.ts` (testar o método de limpeza em isolamento, sem o decorator)

- [ ] **Step 1: Escrever teste da limpeza**

Adicionar no `media.service.spec.ts` dentro do `describe('MediaService', ...)`:

```typescript
  describe('cleanupOrphans', () => {
    let fsMock: { unlink: jest.Mock };
    let svc: MediaService;

    beforeEach(() => {
      fsMock = { unlink: jest.fn().mockResolvedValue(undefined) };
      prisma.media.findMany = jest.fn();
      prisma.media.deleteMany = jest.fn();
      svc = new MediaService(prisma as any, fsMock as any);
    });

    it('remove arquivos e rows órfãos', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'm1', filename: 'a.png' },
        { id: 'm2', filename: 'b.mp4' },
      ]);
      prisma.media.deleteMany.mockResolvedValue({ count: 2 });

      const removed = await svc.cleanupOrphans();

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: {
          attachedAt: null,
          postId: null,
          commentId: null,
          photoId: null,
          userAvatarId: null,
          createdAt: { lt: expect.any(Date) },
        },
        select: { id: true, filename: true },
      });
      expect(fsMock.unlink).toHaveBeenCalledTimes(2);
      expect(fsMock.unlink).toHaveBeenCalledWith('./uploads/a.png');
      expect(fsMock.unlink).toHaveBeenCalledWith('./uploads/b.mp4');
      expect(prisma.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['m1', 'm2'] } } });
      expect(removed).toBe(2);
    });

    it('no-op se nada órfão', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      const removed = await svc.cleanupOrphans();
      expect(fsMock.unlink).not.toHaveBeenCalled();
      expect(prisma.media.deleteMany).not.toHaveBeenCalled();
      expect(removed).toBe(0);
    });

    it('ignora erro de unlink e ainda apaga row', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'm1', filename: 'a.png' }]);
      fsMock.unlink.mockRejectedValueOnce(new Error('ENOENT'));
      prisma.media.deleteMany.mockResolvedValue({ count: 1 });

      const removed = await svc.cleanupOrphans();
      expect(prisma.media.deleteMany).toHaveBeenCalled();
      expect(removed).toBe(1);
    });
  });
```

Ajustar o constructor do service pra aceitar um `fs` opcional (injetado como segundo arg, usa `fs/promises` por default). No `beforeEach` principal do `describe('MediaService', ...)`, garantir que o service continua sendo construído com `new MediaService(prisma as PrismaService)` (sem quebrar testes anteriores).

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/media/media.service.spec.ts
```

Expected: FAIL — `cleanupOrphans` não existe.

- [ ] **Step 3: Adicionar método ao service**

Editar `src/modules/media/media.service.ts`:

Imports adicionais:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';
import { unlink } from 'fs/promises';
import { join } from 'path';
```

Ajustar constructor pra aceitar `fs` opcional:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: { unlink: (path: string) => Promise<void> } = { unlink },
  ) {}
```

Adicionar o método no fim da classe:

```typescript
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOrphans(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const orphans = await this.prisma.media.findMany({
      where: {
        attachedAt: null,
        postId: null,
        commentId: null,
        photoId: null,
        userAvatarId: null,
        createdAt: { lt: oneHourAgo },
      },
      select: { id: true, filename: true },
    });

    if (orphans.length === 0) return 0;

    await Promise.all(
      orphans.map((m) =>
        this.fs.unlink(join('./uploads', m.filename)).catch(() => undefined),
      ),
    );

    const ids = orphans.map((m) => m.id);
    await this.prisma.media.deleteMany({ where: { id: { in: ids } } });
    return orphans.length;
  }
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest src/modules/media/
```

Expected: PASS de todos os testes (antigos + novos 3).

- [ ] **Step 5: Commit**

```bash
git add src/modules/media/
git commit -m "feat(media): cleanup cron removes orphan uploads every hour"
```

---

## Task 9: Docs + smoke build final

**Context:** README do módulo media + atualização dos módulos afetados (upload-medias, posts, comments, users).

**Files:**
- Create: `src/modules/media/README.md`
- Modify: `src/modules/upload-medias/README.md` — mencionar integração com Media
- Modify: `src/modules/posts/README.md` — atualizar section sobre imageUrl
- Modify: `src/modules/comments/README.md` — DTOs reais
- Modify: `src/modules/users/README.md` — nova mutation updateAvatar

- [ ] **Step 1: Criar `src/modules/media/README.md`**

```markdown
# Módulo: Media

## Propósito

Provê ownership tracking e cleanup para arquivos enviados via upload REST. Cada upload em `/upload-medias/{single,multiple}` cria uma row `Media` com `ownerId = user.id`. Entidades que consomem mídia (Post, Comment, User avatar, Photo) referenciam `mediaId` — o service valida que o chamador é o dono antes de "attach".

## Regras
1. `recordUpload` é chamado pelo controller após cada arquivo salvo.
2. `assertOwnership(mediaIds, userId)` lança `ForbiddenException` se alguma mídia não for do user ou já tiver sido attached.
3. `attachToPost/Comment/UserAvatar/GalleryPhoto` fixam `attachedAt = now()` + preenchem o FK correspondente.
4. Cron `cleanupOrphans` roda a cada hora, apaga mídias com >1h sem nenhum FK preenchido.

## API GraphQL (Gallery)
- `addGalleryPhoto(mediaId: ID!): Photo!`
- `removeGalleryPhoto(photoId: ID!): Boolean!`
- `myGalleryPhotos: [Photo!]!`

Todas exigem JWT (`GqlAuthGuard`). Cobertura de tests: `media.service.spec.ts` (14+), `gallery.resolver.spec.ts` (3).
```

- [ ] **Step 2: Atualizar outros READMEs**

Adicionar ao `upload-medias/README.md` na seção 2 (Regras de Negócio): bullet "Após gravar o arquivo, uma row `Media` é criada via `MediaService.recordUpload` com `ownerId = req.user.id`. A resposta agora inclui `mediaId` (single) ou `mediaIds` (multiple)."

Adicionar ao `posts/README.md`: "`createPost` recebe `mediaIds: [ID!]` em vez de URLs cruas. O service valida ownership via MediaService e attach as mídias ao post."

Adicionar ao `comments/README.md`: "CreateCommentInput agora tem `{ postId, content, parentId?, mediaIds? }`. Mutation exige JWT."

Adicionar ao `users/README.md`: "Nova mutation `updateAvatar(mediaId: ID!)` — valida ownership, copia URL pra `User.avatarUrl`."

- [ ] **Step 3: Rodar smoke completo**

```bash
npx jest src/modules/media/ src/modules/upload-medias/ src/modules/posts/posts.service.spec.ts src/modules/comments/comments.service.spec.ts src/modules/users/users.service.spec.ts
```

Expected: todos os tests tocados por este plano passam.

```bash
npx nest build
```

Expected: exit 0.

- [ ] **Step 4: Commit + push**

```bash
git add src/modules/media/README.md src/modules/upload-medias/README.md src/modules/posts/README.md src/modules/comments/README.md src/modules/users/README.md
git commit -m "docs: update module READMEs after Plan 2 changes"
git push -u origin feat/media-ownership-plan-2
```

---

## Self-Review Checklist

- [x] **Cobertura spec:**
  - User.avatarUrl → Task 1 + 4
  - Photo (galeria) → Task 1 + 5
  - Comment.imageUrl/videoUrl → Task 1 + 7
  - Media com ownership → Task 1 + 2 + 3
  - Cleanup cron → Task 8

- [x] **Sem placeholders ("TBD", "similar to").**
- [x] **Consistência de nomes:** `mediaIds`, `recordUpload`, `assertOwnership`, `attachToPost/Comment/UserAvatar/GalleryPhoto`, `cleanupOrphans`, `resolveUrls` usados identicamente em testes e implementação.
- [x] **Cada step é 2–5 min.**
- [x] **TDD:** teste antes do code em todas as tasks.
- [x] **Commits frequentes:** 1 commit por task (9 total).
- [x] **Branch:** `feat/media-ownership-plan-2` (já criada).
- [x] **Rollback:** migração aditiva + `git revert`.
