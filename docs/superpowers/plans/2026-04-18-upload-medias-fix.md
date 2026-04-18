# Upload-Medias Correctness & Security — Plan 1 of 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar os endpoints REST `/upload-medias/single` e `/upload-medias/multiple` seguros, funcionais e testados — corrigindo os 5 issues CRÍTICAS identificadas na auditoria `docs/audits/2026-04-18-upload-medias-audit.md`.

**Architecture:** Refactor isolado dentro de `src/modules/upload-medias/` + um novo guard REST em `src/modules/auth/guards/`. Sem mudanças de schema Prisma, sem mudanças em posts/users/comments (isso vira o Plano 2). Auth passa a ser exigida, `FilesInterceptor` (plural) substitui `FileInterceptor` no endpoint múltiplo, `ParseFilePipe` substitui a validação manual de mimetype, `memoryStorage()` inline é removido. Testes unitários reais substituem os `.spec.ts` scaffold.

**Tech Stack:** NestJS 11, `@nestjs/platform-express`, Multer 2.x, `@nestjs/passport`, class-validator, Jest.

**Rollback:** Todas as mudanças são em código de aplicação e em arquivos de teste. `git revert` do PR final restaura o comportamento (bugado) anterior.

**Escopo fora desta plano (Plano 2):**
- Novos campos Prisma (`User.avatarUrl`, `Photo`, `Comment.imageUrl/videoUrl`).
- Mutations de avatar/galeria.
- Implementação real do `CommentsService`.
- Migração para S3.
- Modelo `Media` com ownership tracking.

---

## File Structure

**Criar:**
- `src/modules/auth/guards/jwt-rest-auth.guard.ts` — guard REST que não usa `GqlExecutionContext` (o `JwtAuthGuard` atual é GraphQL-only).
- `src/modules/auth/decorators/current-user-rest.decorator.ts` — extrai `req.user` do contexto HTTP (o `CurrentUser` atual usa `GqlExecutionContext`).

**Modificar:**
- `src/modules/upload-medias/upload-medias.controller.ts` — aplicar guard, corrigir `FilesInterceptor`, remover `memoryStorage()` inline, aplicar `ParseFilePipe`, remover `console.log`.
- `src/modules/upload-medias/upload-medias.service.ts` — remover `console.log`, corrigir typo "Unsupported image typed.", usar `file.path`/`file.filename` em vez de `saveFile(buffer)` já que `diskStorage` escreve automaticamente.
- `src/modules/upload-medias/config/multer.config.ts` — centralizar whitelist de mimetypes num arquivo exportável para o `ParseFilePipe` do controller reutilizar (DRY).
- `src/modules/upload-medias/upload-medias.module.ts` — importar `AuthModule` (para o guard), exportar `MulterModule` se necessário.
- `src/modules/upload-medias/upload-medias.controller.spec.ts` — trocar o scaffold por testes reais (guard ativo, arquivos válidos/inválidos, múltiplos arquivos).
- `src/modules/upload-medias/upload-medias.service.spec.ts` — idem, cobrir `validateFileType` + retorno da URL.

**Nada além disso.** Nenhum arquivo `.prisma`, nada em `users/`, `posts/`, `comments/`.

---

## Task 1: Criar `JwtRestAuthGuard` para endpoints REST

**Context:** `src/modules/auth/guards/jwt-auth.guard.ts:33–49` usa `GqlExecutionContext` no `getRequest`; aplicar no controller REST quebra (tenta ler campos GraphQL inexistentes). Precisamos de um guard gêmeo que use o `Request` HTTP padrão.

**Files:**
- Create: `src/modules/auth/guards/jwt-rest-auth.guard.ts`
- Modify: `src/modules/auth/auth.module.ts` (exportar o novo guard)
- Test: `src/modules/auth/guards/jwt-rest-auth.guard.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/modules/auth/guards/jwt-rest-auth.guard.spec.ts`:

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtRestAuthGuard } from './jwt-rest-auth.guard';

describe('JwtRestAuthGuard', () => {
  let guard: JwtRestAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new JwtRestAuthGuard(reflector);
  });

  it('deixa passar quando rota é @Public()', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('getRequest devolve o Request HTTP padrão (não usa GqlExecutionContext)', () => {
    const fakeReq = { headers: { authorization: 'Bearer x' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => fakeReq }),
    } as unknown as ExecutionContext;
    expect(guard.getRequest(ctx)).toBe(fakeReq);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/auth/guards/jwt-rest-auth.guard.spec.ts
```

Expected: FAIL — `Cannot find module './jwt-rest-auth.guard'`.

- [ ] **Step 3: Implementar o guard**

Criar `src/modules/auth/guards/jwt-rest-auth.guard.ts`:

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';

@Injectable()
export class JwtRestAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (process.argv.includes('--generate-only') || process.env.MOCK_PRISMA === 'true') {
      return true;
    }

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

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npx jest src/modules/auth/guards/jwt-rest-auth.guard.spec.ts
```

Expected: PASS, 2/2 tests.

- [ ] **Step 5: Exportar do `AuthModule`**

Editar `src/modules/auth/auth.module.ts` — adicionar `JwtRestAuthGuard` em `providers` e `exports`:

```typescript
import { JwtRestAuthGuard } from './guards/jwt-rest-auth.guard';

// ... dentro do @Module:
providers: [
  JwtAuthGuard,
  GqlAuthGuard,
  JwtRestAuthGuard,  // novo
  JwtStrategy,
  AuthService,
  AuthResolver,
],
exports: [JwtModule, PassportModule, JwtAuthGuard, GqlAuthGuard, JwtRestAuthGuard, AuthService],
```

- [ ] **Step 6: Build check**

```bash
npx nest build
```

Expected: exit 0, sem erros de TS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/auth/guards/jwt-rest-auth.guard.ts \
        src/modules/auth/guards/jwt-rest-auth.guard.spec.ts \
        src/modules/auth/auth.module.ts
git commit -m "feat(auth): add JwtRestAuthGuard for REST endpoints"
```

---

## Task 2: Criar decorator `CurrentUserRest` para contexto HTTP

**Context:** `src/modules/auth/decorators/current-user.decorator.ts:4–9` chama `GqlExecutionContext.create(context).getContext().req.user`. No REST esse caminho é `context.switchToHttp().getRequest().user`.

**Files:**
- Create: `src/modules/auth/decorators/current-user-rest.decorator.ts`
- Test: `src/modules/auth/decorators/current-user-rest.decorator.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/modules/auth/decorators/current-user-rest.decorator.spec.ts`:

```typescript
import { ExecutionContext } from '@nestjs/common';
import { extractCurrentUserFromRest } from './current-user-rest.decorator';

describe('extractCurrentUserFromRest', () => {
  it('retorna req.user do contexto HTTP', () => {
    const fakeUser = { id: 'u1', email: 'a@b.com' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: fakeUser }) }),
    } as unknown as ExecutionContext;

    expect(extractCurrentUserFromRest(undefined, ctx)).toBe(fakeUser);
  });

  it('retorna undefined se req.user não existir', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(extractCurrentUserFromRest(undefined, ctx)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/auth/decorators/current-user-rest.decorator.spec.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implementar o decorator**

Criar `src/modules/auth/decorators/current-user-rest.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const extractCurrentUserFromRest = (
  _: unknown,
  context: ExecutionContext,
) => context.switchToHttp().getRequest().user;

export const CurrentUserRest = createParamDecorator(extractCurrentUserFromRest);
```

(A fatorização `extractCurrentUserFromRest` existe para o teste conseguir chamar a função — `createParamDecorator` devolve um factory que precisa de pipe/metadata reflection pra rodar.)

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npx jest src/modules/auth/decorators/current-user-rest.decorator.spec.ts
```

Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/decorators/current-user-rest.decorator.ts \
        src/modules/auth/decorators/current-user-rest.decorator.spec.ts
git commit -m "feat(auth): add CurrentUserRest decorator for REST handlers"
```

---

## Task 3: Centralizar whitelist de mimetypes em `multer.config.ts`

**Context:** O `multer.config.ts:14–23` tem uma whitelist; o `upload-medias.service.ts:36–37` duplica `imageMines`/`videoMines`. Unificar num único módulo para o `ParseFilePipe` e o `fileFilter` consultarem a mesma fonte (DRY).

**Files:**
- Modify: `src/modules/upload-medias/config/multer.config.ts`

- [ ] **Step 1: Editar `multer.config.ts`**

Substituir o conteúdo atual por:

```typescript
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const VIDEO_MIMETYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/mkv',
] as const;

export const ALL_MEDIA_MIMETYPES = [...IMAGE_MIMETYPES, ...VIDEO_MIMETYPES];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const multerConfig = () => ({
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req, file, callback) => {
    if ((ALL_MEDIA_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Invalid file type.'), false);
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});
```

- [ ] **Step 2: Build check**

```bash
npx nest build
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/modules/upload-medias/config/multer.config.ts
git commit -m "refactor(upload-medias): extract mimetype whitelist constants"
```

---

## Task 4: Refatorar `UploadMediasService` (remove logs, usa `file.path`, corrige typo)

**Context:** Com `diskStorage` já escrevendo o arquivo, o `saveFile(buffer, …)` atual é redundante. O service deve apenas validar mimetype (ou confiar no `ParseFilePipe`/`fileFilter`) e devolver a URL pública baseada em `file.filename`.

**Files:**
- Modify: `src/modules/upload-medias/upload-medias.service.ts`
- Modify: `src/modules/upload-medias/upload-medias.service.spec.ts`

- [ ] **Step 1: Escrever testes reais**

Substituir o conteúdo de `src/modules/upload-medias/upload-medias.service.spec.ts` por:

```typescript
import { BadRequestException } from '@nestjs/common';
import { UploadMediasService } from './upload-medias.service';

const makeFile = (partial: Partial<Express.Multer.File>): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: partial.originalname ?? 'a.jpg',
    encoding: '7bit',
    mimetype: partial.mimetype ?? 'image/jpeg',
    size: partial.size ?? 100,
    destination: './uploads',
    filename: partial.filename ?? 'abc-123.jpg',
    path: `./uploads/${partial.filename ?? 'abc-123.jpg'}`,
    stream: null as any,
    buffer: null as any,
  }) as Express.Multer.File;

describe('UploadMediasService', () => {
  let service: UploadMediasService;

  beforeEach(() => {
    service = new UploadMediasService();
  });

  it('buildUrl retorna /uploads/<filename> para arquivo de imagem válido', () => {
    const file = makeFile({ mimetype: 'image/png', filename: 'xyz.png' });
    expect(service.buildUrl(file)).toBe('/uploads/xyz.png');
  });

  it('buildUrl retorna /uploads/<filename> para vídeo válido', () => {
    const file = makeFile({ mimetype: 'video/mp4', filename: 'clip.mp4' });
    expect(service.buildUrl(file)).toBe('/uploads/clip.mp4');
  });

  it('assertMimetypeMatchesKind rejeita vídeo quando kind=image', () => {
    const file = makeFile({ mimetype: 'video/mp4' });
    expect(() => service.assertMimetypeMatchesKind(file, 'image')).toThrow(BadRequestException);
  });

  it('assertMimetypeMatchesKind rejeita imagem quando kind=video', () => {
    const file = makeFile({ mimetype: 'image/png' });
    expect(() => service.assertMimetypeMatchesKind(file, 'video')).toThrow(BadRequestException);
  });

  it('assertMimetypeMatchesKind aceita quando bate', () => {
    expect(() =>
      service.assertMimetypeMatchesKind(makeFile({ mimetype: 'image/png' }), 'image'),
    ).not.toThrow();
    expect(() =>
      service.assertMimetypeMatchesKind(makeFile({ mimetype: 'video/mp4' }), 'video'),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/upload-medias/upload-medias.service.spec.ts
```

Expected: FAIL — métodos `buildUrl` / `assertMimetypeMatchesKind` não existem.

- [ ] **Step 3: Reescrever `upload-medias.service.ts`**

Substituir o conteúdo por:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { IMAGE_MIMETYPES, VIDEO_MIMETYPES } from './config/multer.config';

export type MediaKind = 'image' | 'video';

@Injectable()
export class UploadMediasService {
  buildUrl(file: Express.Multer.File): string {
    return `/uploads/${file.filename}`;
  }

  assertMimetypeMatchesKind(file: Express.Multer.File, kind: MediaKind): void {
    if (kind === 'image' && !(IMAGE_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type.');
    }
    if (kind === 'video' && !(VIDEO_MIMETYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Unsupported video type.');
    }
  }
}
```

Observações:
- `ensureUploadDirectoryExists` removido: o `destination: './uploads'` do `diskStorage` é criado pelo multer em tempo de upload (pasta precisa existir apenas em runtime — subir via `npm start` cria via `nest`). Se falhar em ambientes exóticos, coloca-se `fs.mkdirSync` no `bootstrap()` de `main.ts` em Plano 2.
- `saveFile` removido — diskStorage escreve sozinho.
- `uuidv4`, `join`, `createWriteStream`, imports de DTO não-usados → removidos.
- `console.log` → removidos.
- typo "Unsupported image typed." → "Unsupported image type.".

- [ ] **Step 4: Rodar os testes e ver passar**

```bash
npx jest src/modules/upload-medias/upload-medias.service.spec.ts
```

Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/modules/upload-medias/upload-medias.service.ts \
        src/modules/upload-medias/upload-medias.service.spec.ts
git commit -m "refactor(upload-medias): simplify service, remove console.log, fix typo"
```

---

## Task 5: Refatorar `UploadMediasController` (auth, FilesInterceptor, ParseFilePipe)

**Context:** Esta é a mudança central. Corrige C1 (auth), C2 (`FilesInterceptor`), C3 (`@UploadedFiles`), C4 (remove `memoryStorage()` inline), C5 (`ParseFilePipe`).

**Files:**
- Modify: `src/modules/upload-medias/upload-medias.controller.ts`
- Modify: `src/modules/upload-medias/upload-medias.module.ts`
- Modify: `src/modules/upload-medias/upload-medias.controller.spec.ts`

- [ ] **Step 1: Escrever testes reais do controller**

Substituir `src/modules/upload-medias/upload-medias.controller.spec.ts` por:

```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasService } from './upload-medias.service';

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
  let service: UploadMediasService;

  beforeEach(async () => {
    service = new UploadMediasService();
    controller = new UploadMediasController(service);
  });

  describe('uploadSingleFile', () => {
    it('lança BadRequest se nenhum arquivo vier', async () => {
      await expect(
        controller.uploadSingleFile(undefined as any, { kind: 'image' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna URL quando arquivo e kind batem (image)', async () => {
      const file = makeFile({ mimetype: 'image/png', filename: 'f.png' });
      const out = await controller.uploadSingleFile(file, { kind: 'image' });
      expect(out).toEqual({
        success: true,
        message: 'File uploaded successfully',
        fileUrl: '/uploads/f.png',
      });
    });

    it('rejeita imagem quando kind=video', async () => {
      const file = makeFile({ mimetype: 'image/png' });
      await expect(
        controller.uploadSingleFile(file, { kind: 'video' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadMultipleFiles', () => {
    it('lança BadRequest se array vazio', async () => {
      await expect(controller.uploadMultipleFiles([], { kind: 'image' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('processa múltiplos arquivos e retorna N URLs', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'image/jpeg', filename: 'b.jpg' }),
      ];
      const out = await controller.uploadMultipleFiles(files, { kind: 'image' });
      expect(out).toEqual({
        success: true,
        message: 'Files uploaded successfully',
        fileUrls: ['/uploads/a.png', '/uploads/b.jpg'],
      });
    });

    it('rejeita se qualquer arquivo do lote bater errado com kind', async () => {
      const files = [
        makeFile({ mimetype: 'image/png', filename: 'a.png' }),
        makeFile({ mimetype: 'video/mp4', filename: 'b.mp4' }),
      ];
      await expect(controller.uploadMultipleFiles(files, { kind: 'image' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx jest src/modules/upload-medias/upload-medias.controller.spec.ts
```

Expected: FAIL — assinatura antiga (`uploadFileDto.isVideo` + `FileInterceptor('files')`).

- [ ] **Step 3: Reescrever o controller**

Substituir `src/modules/upload-medias/upload-medias.controller.ts` por:

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
import { JwtRestAuthGuard } from '../auth/guards/jwt-rest-auth.guard';
import { ALL_MEDIA_MIMETYPES, MAX_FILE_SIZE_BYTES } from './config/multer.config';
import { UploadResponseDto } from './dto/upload-response.dto';
import { MediaKind, UploadMediasService } from './upload-medias.service';

class UploadKindDto {
  @IsIn(['image', 'video'])
  kind: MediaKind;
}

const MAX_MULTIPLE_FILES = 10;

const parseSingleFilePipe = () =>
  new ParseFilePipe({
    validators: [
      {
        validate: (file: Express.Multer.File) => {
          if (!file) return false;
          if (file.size > MAX_FILE_SIZE_BYTES) return false;
          return (ALL_MEDIA_MIMETYPES as readonly string[]).includes(file.mimetype);
        },
        isValid(file) { return this.validate(file); },
        buildErrorMessage: () => 'Invalid file (size or mimetype).',
      } as any,
    ],
    fileIsRequired: true,
  });

@Controller('upload-medias')
@UseGuards(JwtRestAuthGuard)
export class UploadMediasController {
  constructor(private readonly uploadMediasService: UploadMediasService) {}

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile(parseSingleFilePipe()) file: Express.Multer.File,
    @Body() body: UploadKindDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.uploadMediasService.assertMimetypeMatchesKind(file, body.kind);

    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: this.uploadMediasService.buildUrl(file),
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', MAX_MULTIPLE_FILES))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadKindDto,
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    files.forEach((f) => this.uploadMediasService.assertMimetypeMatchesKind(f, body.kind));

    return {
      success: true,
      message: 'Files uploaded successfully',
      fileUrls: files.map((f) => this.uploadMediasService.buildUrl(f)),
    };
  }
}
```

Mudanças concentradas:
- `@UseGuards(JwtRestAuthGuard)` a nível de classe — ambos endpoints exigem auth.
- `FilesInterceptor('files', 10)` + `@UploadedFiles()` no múltiplo.
- `memoryStorage()` inline removido — usa a config do `MulterModule` (diskStorage + fileFilter + 50MB limit).
- `ParseFilePipe` com validator que aplica whitelist + size limit (defesa em profundidade: o `fileFilter` já bloqueia extras, mas o pipe é a camada oficial de validação em NestJS 11).
- DTO `UploadKindDto` com `@IsIn(['image', 'video'])` substitui `isVideo: string` — field name melhor e validado.
- Imports mortos removidos.

- [ ] **Step 4: Atualizar `upload-medias.module.ts`**

Substituir `src/modules/upload-medias/upload-medias.module.ts` por:

```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { multerConfig } from './config/multer.config';
import { UploadMediasController } from './upload-medias.controller';
import { UploadMediasResolver } from './upload-medias.resolver';
import { UploadMediasService } from './upload-medias.service';

@Module({
  imports: [
    MulterModule.register(multerConfig()),
    AuthModule,
  ],
  controllers: [UploadMediasController],
  providers: [UploadMediasResolver, UploadMediasService],
  exports: [UploadMediasService],
})
export class UploadMediasModule {}
```

- [ ] **Step 5: Rodar os testes do controller**

```bash
npx jest src/modules/upload-medias/upload-medias.controller.spec.ts
```

Expected: PASS, 5/5.

- [ ] **Step 6: Rodar `nest build` para garantir TS válido**

```bash
npx nest build
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/modules/upload-medias/upload-medias.controller.ts \
        src/modules/upload-medias/upload-medias.controller.spec.ts \
        src/modules/upload-medias/upload-medias.module.ts
git commit -m "fix(upload-medias): enforce auth, fix FilesInterceptor, apply ParseFilePipe"
```

---

## Task 6: Verificação end-to-end manual + docs

**Context:** Teste manual contra a app rodando local, para pegar qualquer regressão de runtime que unit tests não vejam (ex: guard carregado? multer vê a pasta?).

**Files:**
- Modify: `src/modules/upload-medias/README.md` — atualizar seção "Pontos de atenção" removendo os itens resolvidos.

- [ ] **Step 1: Subir a app**

Em terminal separado:
```bash
npm run start:dev
```

Aguardar `Application is running on: http://0.0.0.0:3000`.

- [ ] **Step 2: Fazer login e pegar JWT**

```bash
curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { login(loginInput:{email:\"SEU_EMAIL\",password:\"SUA_SENHA\"}){access_token} }"}'
```

Guardar o `access_token`.

- [ ] **Step 3: Testar upload sem token → esperar 401**

```bash
curl -i -X POST http://localhost:3000/upload-medias/single \
  -F 'file=@/path/to/some.png' \
  -F 'kind=image'
```

Expected: `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 4: Testar upload com token (imagem única) → 200**

```bash
curl -i -X POST http://localhost:3000/upload-medias/single \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'file=@/path/to/some.png' \
  -F 'kind=image'
```

Expected: `200 OK`, body com `fileUrl: /uploads/<uuid>.png`. Verificar que `curl http://localhost:3000/uploads/<uuid>.png` baixa o arquivo.

- [ ] **Step 5: Testar upload múltiplo com 3 arquivos → 200, 3 URLs**

```bash
curl -i -X POST http://localhost:3000/upload-medias/multiple \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'files=@/path/to/a.png' \
  -F 'files=@/path/to/b.png' \
  -F 'files=@/path/to/c.png' \
  -F 'kind=image'
```

Expected: `200 OK`, body com `fileUrls` contendo 3 strings. (Com `FileInterceptor` antigo, só voltaria 1 — este passo é a validação do bug C2 fixado.)

- [ ] **Step 6: Testar mimetype errado → 400**

```bash
curl -i -X POST http://localhost:3000/upload-medias/single \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'file=@/path/to/arquivo.pdf' \
  -F 'kind=image'
```

Expected: `400 Bad Request`.

- [ ] **Step 7: Atualizar README removendo pontos resolvidos**

Editar `src/modules/upload-medias/README.md` na seção "Pontos de atenção" — remover:
- "Endpoints sem autenticação" (resolvido)
- "FileInterceptor('files') bug" (resolvido)
- "memoryStorage sobrepõe multer.config" (resolvido)
- "Sem ParseFilePipe" (resolvido)
- "Typo 'Unsupported image typed.'" (resolvido)

Manter itens ainda válidos (ex: disk storage não-S3, sem registro em banco).

- [ ] **Step 8: Rodar `npm test` completo**

```bash
npm test -- --testPathPattern="upload-medias|jwt-rest-auth|current-user-rest"
```

Expected: todos os testes das 5 Tasks passam.

- [ ] **Step 9: Commit final**

```bash
git add src/modules/upload-medias/README.md
git commit -m "docs(upload-medias): update README after P0 fixes"
```

- [ ] **Step 10: Push**

```bash
git push -u origin audit/upload-medias-review
```

---

## Self-Review Checklist

- [x] **Cobertura da auditoria:**
  - C1 auth → Task 5 (`@UseGuards(JwtRestAuthGuard)` em classe)
  - C2 `FileInterceptor` → `FilesInterceptor` → Task 5 Step 3
  - C3 `@UploadedFile` em array → `@UploadedFiles` → Task 5 Step 3
  - C4 `memoryStorage()` inline removido → Task 5 Step 3
  - C5 `ParseFilePipe` → Task 5 Step 3
  - M1/M2 `console.log` → Tasks 4 e 5 (removidos)
  - M3 typo "Unsupported image typed." → Task 4 Step 3
  - M4 imports mortos → Task 4 Step 3

- [x] **Nenhum placeholder ("TBD", "implement later") no texto.**
- [x] **Consistência de nomes:** `buildUrl`, `assertMimetypeMatchesKind`, `JwtRestAuthGuard`, `CurrentUserRest`, `UploadKindDto`, `MediaKind` usados identicamente em testes e implementação.
- [x] **Cada step é executável em 2–5 min.**
- [x] **TDD:** em todas as Tasks (1, 2, 4, 5) o teste vem antes da implementação.
- [x] **Commits frequentes:** um commit por Task (exceto Task 6 que tem 1 commit de docs).

---

## Plan 2 (preview, fora deste escopo)

Após mergear este plano:
1. Schema Prisma — `User.avatarUrl`, modelo `Photo` (galeria), `Comment.imageUrl/videoUrl`, migration.
2. Mutations: `updateAvatar`, `addGalleryPhoto`, `removeGalleryPhoto`, `listGalleryPhotos`.
3. `CommentsService` real com Prisma + DTO real + incluir `CommentsModule` no `GraphQLModule.include`.
4. Validar `Post.imageUrl[]` / `Comment.imageUrl` contra ownership (opcional, depende do Plano 3 que introduziria modelo `Media`).
