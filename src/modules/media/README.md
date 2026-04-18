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

Todas exigem JWT (`GqlAuthGuard`). Cobertura de tests: `media.service.spec.ts` (17), `gallery.resolver.spec.ts` (3).
