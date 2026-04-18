# Regras de negócio transversais

Este documento descreve regras de negócio que atravessam mais de um módulo.
Somente regras que foram observadas explicitamente no código-fonte
(em um `if`, `throw`, `update`, `create` ou cron de um service) estão aqui.
Quando uma regra é apenas um `@default` do Prisma ou um valor default de DTO,
isso é sinalizado explicitamente: default do schema não é a mesma coisa que
uma regra aplicada pela aplicação.

> Convenção: afirmações duvidosas ou sem confirmação direta no código
> aparecem marcadas como `A confirmar`.

## 1. Ciclo de vida do usuário

### 1.1 Cadastro cria usuário como `PENDING`

Ao criar um usuário em
[`UsersService.create`](../src/modules/users/users.service.ts#L22-L65),
o service gera um `verificationCode` aleatório de 4 dígitos
(`Math.floor(1000 + Math.random() * 9000)`,
[`users.service.ts:26`](../src/modules/users/users.service.ts#L26)),
dispara um SMS via `SmsService.sendSms`
([`users.service.ts:27`](../src/modules/users/users.service.ts#L27);
implementação em
[`sms.service.ts:20-41`](../src/modules/sms/sms.service.ts#L20-L41),
usando Telesign; o número é prefixado com `+55`) e persiste o usuário.

O campo `status` do usuário tem `@default("PENDING")` em
[`prisma/schema.prisma:29`](../prisma/schema.prisma#L29);
o DTO de criação também aplica o default `StatusUser.PENDING`
([`create-user.input.ts:47-49`](../src/modules/users/dto/create-user.input.ts#L47-L49)).
Observe que o service `create` não seta `status` explicitamente — o estado
inicial `PENDING` vem do default do DTO/schema, e não de uma atribuição
explícita no service.

### 1.2 Transição para `ACTIVE` só acontece após validação do código

A única transição para `ACTIVE` observada no código está em
[`UsersService.activeStatusWithVerificationCode`](../src/modules/users/users.service.ts#L272-L291):
busca o usuário, compara `user.verificationCode !== verificationCode`
(`throw new Error("Code the verification invalid!")` em
[`users.service.ts:280`](../src/modules/users/users.service.ts#L280))
e, em caso de sucesso, executa `update` com `data: {status: StatusUser.ACTIVE}`
([`users.service.ts:283-288`](../src/modules/users/users.service.ts#L283-L288)).

O mutation `verificationCode` em
[`users.resolver.ts:69-78`](../src/modules/users/users.resolver.ts#L69-L78)
exige autenticação (`GqlAuthGuard`) e é liberado para `ADMIN`, `SUPER_ADMIN`
e `USER`. Isso significa que o usuário precisa estar autenticado para ativar
a conta. **A confirmar** se há um fluxo de login alternativo antes da ativação;
no código atual, `AuthService.validateUser`
([`auth.service.ts:21-41`](../src/modules/auth/auth.service.ts#L21-L41))
não verifica `status` antes de conceder o token, então tecnicamente um usuário
`PENDING` consegue autenticar e chamar a mutation.

### 1.3 Update de usuário: não dá para "regredir" status para PENDING

Em [`users.service.ts:198-200`](../src/modules/users/users.service.ts#L198-L200),
se `updateData.status === 'PENDING'` e o usuário já não é `PENDING`,
o service sobrescreve `updateData.status` com o status atual do usuário,
impedindo a regressão. Outras transições de status via `updateUser` são
aceitas sem restrição adicional.

### 1.4 Permissão de `updateUser` e `softDelete`

- `updateUser` rejeita com `"You do not have permission to update user!"`
  se `user.id !== me.id && me.roleId === 1`
  ([`users.service.ts:190-192`](../src/modules/users/users.service.ts#L190-L192)).
  Como `SUPER_ADMIN = 1` em
  [`role.enum.ts:4`](../src/modules/users/enums/role.enum.ts#L4),
  **essa condição bloqueia o SUPER_ADMIN de atualizar outro usuário** —
  o que soa invertido em relação aos nomes esperados.
  **A confirmar** se essa lógica é intencional ou um bug
  (o commit que introduziu a condição trata o roleId literal `1` como restritivo).
- `softDelete` rejeita com a mesma mensagem se `user.id !== me.id && me.roleId === 3`
  ([`users.service.ts:246-248`](../src/modules/users/users.service.ts#L246-L248)).
  `USER = 3`, portanto um usuário comum só pode softDeletar a própria conta —
  essa sim é a leitura esperada.

### 1.5 Soft delete e expurgo após 30 dias

`UsersService.softDelete`
([`users.service.ts:238-269`](../src/modules/users/users.service.ts#L238-L269))
só age quando `user.deletedAt === null`; quando age, grava
`deletedAt = brazilDate` e `status = StatusUser.INACTIVE`
(atenção: a data usada é `new Date() - 3h`, cálculo inline diferente
do helper `CalculateDateBrazilNow` usado em outras partes do service).

O cron `@Cron('0 0 0 * * *')` em
[`users.service.ts:316-340`](../src/modules/users/users.service.ts#L316-L340)
roda diariamente à meia-noite (hora do servidor), busca usuários com
`deletedAt <= (brazilDate - 30 dias)` e executa `deleteMany`, removendo-os
fisicamente. **A confirmar** se o agendamento considera fuso do servidor vs
horário de Brasília — o cron NestJS usa o TZ do processo.

### 1.6 `deleteUser` é *hard delete* e só é exposto a ADMIN/SUPER_ADMIN

[`UsersService.deleteUser`](../src/modules/users/users.service.ts#L226-L236)
faz `prisma.user.delete` direto. O mutation `deletedUser` em
[`users.resolver.ts:80-85`](../src/modules/users/users.resolver.ts#L80-L85)
é protegido por `@Roles('ADMIN', 'SUPER_ADMIN')`.

## 2. Papéis (Roles)

Roles observados, com base nos decorators `@Roles(...)` encontrados nos
resolvers:

- `SUPER_ADMIN`
- `ADMIN`
- `USER`

Enum numérico correspondente em
[`role.enum.ts:3-8`](../src/modules/users/enums/role.enum.ts#L3-L8):
`SUPER_ADMIN = 1`, `ADMIN = 2`, `USER = 3`.

`RolesService`
([`roles.service.ts`](../src/modules/roles/roles.service.ts))
está efetivamente vazio (todos os métodos comentados); não há CRUD de roles
exposto no runtime a partir deste module.

A verificação em tempo de request é feita por `RolesGuard`
([`roles.guard.ts:12-37`](../src/modules/auth/guards/roles.guard.ts#L12-L37)).
O guard:

1. lê `ROLES_KEY` do handler/classe;
2. se `requiredRoles` estiver vazio, libera;
3. caso contrário, compara `requiredRoles.includes(role)` onde `role` vem
   de `user.role` (string) ou `user.role.name` (quando é o objeto relacional).

O JWT emitido em
[`auth.service.ts:48`](../src/modules/auth/auth.service.ts#L48)
inclui `role: typeof user.role === 'string' ? user.role : user.role.name`.

Resolvers que usam `@Roles` no código atual:

- `users.resolver.ts`: queries e mutations com
  [`@Roles('ADMIN', 'SUPER_ADMIN')`](../src/modules/users/users.resolver.ts#L28)
  ou
  [`@Roles('ADMIN', 'SUPER_ADMIN', 'USER')`](../src/modules/users/users.resolver.ts#L35).
- `complaints.resolver.ts`:
  [`@Roles('ADMIN', 'SUPER_ADMIN', 'USER')`](../src/modules/complaints/complaints.resolver.ts#L17)
  em `createComplaint`.

> **A confirmar:** resolvers de `posts`, `comments`, `plans`,
> `subscriptions`, `subscription-status`, `payments` e `pag-seguro` não
> possuem decorator `@Roles` ativo no código inspecionado. Não confirmei
> por inspeção se possuem proteção via `@UseGuards(GqlAuthGuard)` apenas
> ou se são públicos.

## 3. Modelo de assinatura

### 3.1 Criação de assinatura exige plano existente e intervalo válido

[`SubscriptionsService.create`](../src/modules/subscriptions/subscriptions.service.ts#L15-L51):

1. Chama `checkingValiableCreateNewSubscription(userId)` antes de qualquer
   coisa ([`subscriptions.service.ts:17`](../src/modules/subscriptions/subscriptions.service.ts#L17));
   note que esta chamada **não é aguardada** (`await` ausente) — então a
   verificação roda em paralelo com o resto e seu `throw` pode chegar depois
   que o `create` já começou. **A confirmar** se isso é intencional.
2. Exige `createSubscriptionInput.interval`:
   `throw new BadRequestException('The "interval" field is required!')`
   ([`subscriptions.service.ts:19-21`](../src/modules/subscriptions/subscriptions.service.ts#L19-L21)).
3. Converte o intervalo em dias via `calculateIntervalSubscription`
   ([`subscriptions.service.ts:70-75`](../src/modules/subscriptions/subscriptions.service.ts#L70-L75)):
   `'MONTH'` → 30, `'YEAR'` → 365, outros → `BadRequestException`.
4. Calcula `startDate = brazilDate()`, `endDate = startDate + timeInterval`,
   e um `trialEnd = startDate + 7 dias`
   ([`subscriptions.service.ts:24-28`](../src/modules/subscriptions/subscriptions.service.ts#L24-L28)).
5. Busca o plano com `findUniqueOrThrow`
   ([`subscriptions.service.ts:29-31`](../src/modules/subscriptions/subscriptions.service.ts#L29-L31)).
6. Define `amount = createSubscriptionInput.amount ?? Math.trunc(timeInterval / 30) * plan.price`
   ([`subscriptions.service.ts:32`](../src/modules/subscriptions/subscriptions.service.ts#L32)).
   Ou seja: se o cliente mandou `amount`, vale o mandado; caso contrário,
   calcula como número de meses completos × `plan.price`.
7. Persiste com `isActive: true` sempre, `statusId` vindo do input
   e `trialEnd` preenchido
   ([`subscriptions.service.ts:34-48`](../src/modules/subscriptions/subscriptions.service.ts#L34-L48)).

### 3.2 Invariante: no máximo uma assinatura "ativa" por usuário

`checkingValiableCreateNewSubscription`
([`subscriptions.service.ts:84-115`](../src/modules/subscriptions/subscriptions.service.ts#L84-L115))
consulta `subscription` do usuário com `isActive: true` E
`status.slug IN ['active', 'incomplete', 'trialing', 'pastDue']`.
Se encontrar qualquer assinatura em `trialing`, **atualiza-a para
`isActive: false, statusId: 3`** antes de decidir
([`subscriptions.service.ts:106-108`](../src/modules/subscriptions/subscriptions.service.ts#L106-L108)).
Se, depois disso, sobrar alguma string de mensagem (`msg` não vazia), lança:

```
BadRequestException(`Erro: usuário contém ${size} subscriptions ativas: ${msg}`)
```

> **A confirmar:** o `statusId: 3` usado para "desativar trials" é um número
> mágico no código; o mapeamento real depende dos registros seedados em
> `SubscriptionStatus`. O service `subscription-status` apenas expõe CRUD
> e `findSubscriptionStatusByName(slug)`
> ([`subscription-status.service.ts:19-23`](../src/modules/subscription-status/subscription-status.service.ts#L19-L23));
> não há seed observado no código.

Também note o bug: `if(subscriptions)` sempre é truthy (array vazio é truthy),
então o loop sempre executa, mas `size = subscriptions.length` pode ser `0`
e o `if(msg)` bloqueia o throw nesse caso.

### 3.3 Pagamentos são criados a partir do webhook do PagSeguro

`PagSeguroService.createAndPaymentOrder`
([`pag-seguro.service.ts:113-135`](../src/modules/pag-seguro/pag-seguro.service.ts#L113-L135)):

- Exige pelo menos um dos campos `boleto`, `cardCredit` ou `pix` no input
  (`throw new Error('No payment method!')` em
  [`pag-seguro.service.ts:117-119`](../src/modules/pag-seguro/pag-seguro.service.ts#L117-L119)).
- Sobrescreve `notification_urls[0]` com a env `NOTIFICATION_PAYMENTS_URL`
  ([`pag-seguro.service.ts:121-122`](../src/modules/pag-seguro/pag-seguro.service.ts#L121-L122)).
- **A chamada a `payment.createPaymentDataRaw(response.data)` está comentada**
  ([`pag-seguro.service.ts:133`](../src/modules/pag-seguro/pag-seguro.service.ts#L133))
  — portanto, nesse fluxo síncrono, nenhum `Payment` é persistido.

`PaymentsService.createPaymentDataRaw`
([`payments.service.ts:16-44`](../src/modules/payments/payments.service.ts#L16-L44))
existe e é o ponto que cria o `Payment` no Prisma. Ele:

1. Busca a `subscription` pelo `reference_id` do payload
   ([`payments.service.ts:18-22`](../src/modules/payments/payments.service.ts#L18-L22)).
2. Infere o método: se houver `data.qr_codes[0].expiration_date` → `'PIX'`;
   caso contrário, `data.charges[0].payment_method.type`
   ([`payments.service.ts:24-26`](../src/modules/payments/payments.service.ts#L24-L26)).
3. Usa `FactoryMehtodPaymnet.getFactory(paymentMethodFactory).generate(data)`
   para extrair os campos (`amount`, `currency`, `chargesId`, `paymentMethod`,
   `paymentDetails`, `status`).
4. Persiste o `Payment` com `subscriptionId`, `orderId`, `userId`, `planId`
   derivados da `subscription`.

`FactoryMehtodPaymnet.getFactory`
([`factorymethod-paymnet.ts:14-23`](../src/modules/payments/factory/factorymethod-paymnet.ts#L14-L23))
reconhece apenas `'BOLETO'` e `'PIX'`; qualquer outro valor
(incluindo `'CREDIT_CARD'`) dispara `throw new Error('Método de pagamento não suportado')`.
Existe um arquivo
[`response-data-card-credit.factory.ts`](../src/modules/payments/factory/response-data-card-credit.factory.ts)
implementando a factory de cartão, mas ele não está registrado em `getFactory`.
**A confirmar** se pagamento por cartão de fato persiste `Payment` pelo fluxo
atual.

> **A confirmar:** quem chama `createPaymentDataRaw`? Dado que a chamada
> em `PagSeguroService` está comentada, o único chamador provável é um
> webhook HTTP dedicado a pagamentos. Não localizei esse chamador no código
> inspecionado.

### 3.4 Validação de assinatura PagBank

`PagSeguroService.validationSignature`
([`pag-seguro.service.ts:168-180`](../src/modules/pag-seguro/pag-seguro.service.ts#L168-L180))
calcula `sha256(PAGBANK_WEBHOOK_SECRET + "-" + payload)` e faz `console.log`
da comparação. **O método não lança nem retorna booleano** no código atual,
portanto assinatura inválida não bloqueia a requisição — apenas imprime logs.

## 4. Gate "Ultimate" / tiers de plano

A busca por `ultimate|ULTIMATE|Ultimate` em `src/**/*.ts` retorna apenas
duas declarações de enum idênticas:

- [`src/modules/plans/enum/plan-slug.enum.ts`](../src/modules/plans/enum/plan-slug.enum.ts)
- [`src/modules/subscriptions/enum/plan-slug.enum.ts`](../src/modules/subscriptions/enum/plan-slug.enum.ts)

Ambas expõem `FREE`, `PRO`, `ULTIMATE`. **Nenhum service ou guard no runtime
consome esses valores para restringir endpoints ou mutations.** Não há um
"gate Ultimate" implementado — apenas a enum está declarada.

> **A confirmar:** se há intenção de restringir funcionalidades por tier, ela
> não chegou ao código.

## 5. Moderação de conteúdo

### 5.1 Fluxo de denúncia

`ComplaintsService.createComplaint`
([`complaints.service.ts:18-114`](../src/modules/complaints/complaints.service.ts#L18-L114)):

1. Exige `postId` OU `commentId` no input; caso nenhum seja informado,
   `throw new Error('É necessário informar postId ou commentId')`
   ([`complaints.service.ts:49`](../src/modules/complaints/complaints.service.ts#L49)).
2. Se `postId` foi passado, valida com `prisma.post.findUnique`;
   se o post não existir, `throw new Error('Post não encontrado')`
   ([`complaints.service.ts:26-37`](../src/modules/complaints/complaints.service.ts#L26-L37)).
   Caso contrário, `reportedUserId = post.authorId` e
   `reportedContent = post.content`.
3. Comportamento análogo para `commentId`
   ([`complaints.service.ts:38-47`](../src/modules/complaints/complaints.service.ts#L38-L47)).
4. Cria o registro `Complaint` com `status: 'PENDING'` sempre
   ([`complaints.service.ts:68`](../src/modules/complaints/complaints.service.ts#L68)).
   Note que o `Prisma.schema` também tem `@default("PENDING")` em
   [`schema.prisma:202`](../prisma/schema.prisma#L202),
   mas aqui o service atribui explicitamente.
5. Publica no Pub/Sub (`date-me-topic-reporting-reported-posts-queue`) um
   payload com `complaintId`, `reason`, `description`, `reportedUserId`,
   `createdAt` e conteúdo denunciado
   ([`complaints.service.ts:99-111`](../src/modules/complaints/complaints.service.ts#L99-L111)).
   Em caso de falha de publicação, só re-lança se
   `process.env.NODE_ENV !== 'development'`
   ([`complaints.service.ts:107-110`](../src/modules/complaints/complaints.service.ts#L107-L110)).

### 5.2 Resolução de denúncia via webhook

`ReportingController` expõe `POST /v1/reporting-reported-posts-resolved`
([`reporting.service.controller.ts:17-53`](../src/modules/reporting/reporting.service.controller.ts#L17-L53)),
marcado com `@Public()` (sem auth). Recebe um envelope Pub/Sub, decodifica
o payload base64 e chama `ReportingService.processReport`.

`ReportingService.processReport`
([`reporting.service.ts:12-37`](../src/modules/reporting/reporting.service.ts#L12-L37)):

- Busca a `Complaint` por `complaintId`.
- Se não existir, apenas loga e retorna (não lança).
- Caso exista, faz `update` gravando
  `appraiser: AppraiserEnum.ASSISTANT` (= `"assistant"` em
  [`appraiser.enum.ts:3-6`](../src/modules/complaints/enum/appraiser.enum.ts#L3-L6)),
  `status: complaintPayload.agent.acao_recommended`
  e `analysesComplaints: complaintPayload.agent`.

> **A confirmar:** o campo é `acao_recommended` no reporting, mas o
> `AssistantAiService` devolve `acao_recomendada`
> ([`assistant_ai.service.ts:18`](../src/modules/assistant_ai/assistant_ai.service.ts#L18)).
> Essa discrepância sugere que o valor pode cair como `undefined` quando vindo
> direto do LLM deste repositório.

### 5.3 Moderação com Anthropic SDK

`AssistantAiService`
([`assistant_ai.service.ts`](../src/modules/assistant_ai/assistant_ai.service.ts))
importa `Anthropic from '@anthropic-ai/sdk'` e usa o modelo
`'claude-sonnet-4-5-20250929'` com `max_tokens: 1024`
([`assistant_ai.service.ts:45-50`](../src/modules/assistant_ai/assistant_ai.service.ts#L45-L50)).
O service:

- Categoriza entre: `discurso_de_odio`, `ameaca`, `assedio`,
  `desinformacao_grave`, `golpe_financeiro`,
  `conteudo_sexual_explicito`, `spam`, `falso_positivo`
  ([`assistant_ai.service.ts:6-14`](../src/modules/assistant_ai/assistant_ai.service.ts#L6-L14)).
- Retorna severidade, confiança (0-100), justificativa e
  `acao_recomendada` (`ignorar|avisar|remover|banir|investigar`).
- Em caso de erro de parse, retorna fallback conservador com
  `categoria: 'falso_positivo'` e `acao_recomendada: 'investigar'`
  ([`assistant_ai.service.ts:151-158`](../src/modules/assistant_ai/assistant_ai.service.ts#L151-L158)).
- `analisarLote` processa em batches de 5 em paralelo para respeitar rate
  limits ([`assistant_ai.service.ts:170-183`](../src/modules/assistant_ai/assistant_ai.service.ts#L170-L183)).

**LangChain não está sendo usado no runtime**; apesar de estar no
`package.json`, nenhum service em `src/modules/**` importa `@langchain/*`.
A moderação efetiva usa apenas `@anthropic-ai/sdk`.

## 6. Soft-delete

Prisma **não** filtra `deletedAt` automaticamente em consultas — isso precisa
ser feito manualmente em cada query. Os models com coluna `deletedAt?` em
[`prisma/schema.prisma`](../prisma/schema.prisma) são:

- `User` ([`schema.prisma:26`](../prisma/schema.prisma#L26))
- `Plan` ([`schema.prisma:86`](../prisma/schema.prisma#L86))
- `Subscription` ([`schema.prisma:116`](../prisma/schema.prisma#L116))
- `SubscriptionStatus` ([`schema.prisma:127`](../prisma/schema.prisma#L127))
- `Post` ([`schema.prisma:164`](../prisma/schema.prisma#L164))

Verificação real dos filtros no código (grep `deletedAt` em `src/modules/**`):

| Model | Service filtra `deletedAt: null`? | Onde |
|-------|-----------------------------------|------|
| `User` | Parcialmente | `findAllUsersPagination` ([`users.service.ts:87`](../src/modules/users/users.service.ts#L87)) e `searchByFilter` ([`users.service.ts:143`](../src/modules/users/users.service.ts#L143)) filtram. **Não filtram**: `findAllUsers` (nenhum `where`), `findUserById` (busca por PK), `updateUser`, `deleteUser`, `softDelete`. |
| `Plan` | **Não** | Nenhuma query em `plans.service.ts` filtra `deletedAt`. |
| `Subscription` | **Não** | Em `subscriptions.service.ts` e `payments.service.ts`, nenhuma leitura filtra `deletedAt`. |
| `SubscriptionStatus` | **Não** | `subscription-status.service.ts` usa `findMany`, `findFirstOrThrow`, `findUniqueOrThrow` sem filtro. |
| `Post` | **Não** | `posts.service.ts` não filtra `deletedAt` nem `deletedStatus` em nenhuma leitura. |

Além de `deletedAt`, `Post` também possui `deletedStatus: Boolean @default(false)`
e `reportedPublication: Boolean @default(false)`
([`schema.prisma:163`, `schema.prisma:167`](../prisma/schema.prisma#L163)),
que também **não são usados** como filtro em `posts.service.ts`.

`Comment` e `Complaint` não possuem `deletedAt` no schema
([`schema.prisma:177-196`, `schema.prisma:198-219`](../prisma/schema.prisma#L177-L219)).

> **Alerta de comportamento:** como apenas partes de `UsersService`
> filtram `deletedAt`, usuários com soft delete aparecem em:
> - `findAllUsers` (listagem plana, [`users.service.ts:67-75`](../src/modules/users/users.service.ts#L67-L75)),
> - `findUserById` ([`users.service.ts:122-133`](../src/modules/users/users.service.ts#L122-L133)),
> - `AuthService.validateUser` ([`auth.service.ts:21-28`](../src/modules/auth/auth.service.ts#L21-L28))
>   — **soft-deletados conseguem logar**, já que a query não exclui
>   `deletedAt != null`.

## 7. Upload de mídias

O handler `UploadMediasController` expõe dois endpoints REST
([`upload-medias.controller.ts:20-82`](../src/modules/upload-medias/upload-medias.controller.ts#L20-L82)):

- `POST /upload-medias/single`
- `POST /upload-medias/multiple`

Ambos usam `FileInterceptor` com `memoryStorage()` (buffer em memória).
`UploadMediasController` não tem `@UseGuards` nem `@Public()` explícito no
código atual.

> **A confirmar:** se há guard global `APP_GUARD` que exige autenticação
> para rotas REST não marcadas `@Public()`. Caso haja, o upload depende de
> JWT; caso não haja, o endpoint é público.

`UploadMediasService.uploadFile`
([`upload-medias.service.ts:16-31`](../src/modules/upload-medias/upload-medias.service.ts#L16-L31)):

1. Converte `isVideoParam` (string `"true"`/outro) em booleano.
2. Valida mimetype contra whitelist:
   - Imagens: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
     ([`upload-medias.service.ts:36`](../src/modules/upload-medias/upload-medias.service.ts#L36)).
   - Vídeos: `video/mp4`, `video/avi`, `video/mov`, `video/mkv`
     ([`upload-medias.service.ts:37`](../src/modules/upload-medias/upload-medias.service.ts#L37)).
   - Mismatch → `BadRequestException('Unsupported video type.' | 'Unsupported image typed.')`.
3. Gera nome `uuidv4() + extensão original` e grava em `./uploads/<nome>`
   via stream local.
4. Retorna `"/uploads/<fileName>"`.

**O upload atual não usa S3.** Apesar de `@aws-sdk/client-s3` estar no
`package.json`, nenhum import de S3 aparece em `src/modules/**`. O código em
`src/aws/` é composto por handlers Lambda independentes (usam `@aws-sdk/client-sqs`,
`@aws-sdk/client-ssm`, `@aws-sdk/client-secrets-manager`) e não participa do
runtime Nest descrito acima.

> **A confirmar:** em qual ambiente a pasta `./uploads` é considerada
> válida (desenvolvimento local vs. produção). Para deployment em
> contêiner stateless, escrever em filesystem local não é durável.

## 8. Outras observações relevantes

### 8.1 Datas em horário de Brasília

Várias criações usam o helper `CalculateDateBrazilNow.brazilDate()`
(veja
[`users.service.ts:29`](../src/modules/users/users.service.ts#L29),
[`subscriptions.service.ts:24`](../src/modules/subscriptions/subscriptions.service.ts#L24)),
enquanto `UsersService.softDelete` calcula a data inline
(`new Date() - 3h`, [`users.service.ts:250-251`](../src/modules/users/users.service.ts#L250-L251)).
Os dois caminhos não estão perfeitamente alinhados — **A confirmar** se
isso causa drift em horário de verão ou similar.

### 8.2 Autenticação, refresh e revogação

`AuthService.login`
([`auth.service.ts:43-74`](../src/modules/auth/auth.service.ts#L43-L74))
emite:

- access token com TTL `JWT_EXPIRES_IN || '15m'`,
- refresh token com TTL `JWT_REFRESH_EXPIRES_IN || '60m'`,
- grava o refresh no cache Redis (`cacheManager.set(\`refresh:${user.id}\`, ..., 3600)`),
  com TTL fixo de 3600 s no código — **independentemente** de
  `JWT_REFRESH_EXPIRES_IN`.

`AuthService.refresh`
([`auth.service.ts:76-105`](../src/modules/auth/auth.service.ts#L76-L105))
aceita o token se (e só se) o valor no Redis for exatamente igual ao
apresentado. `logout` remove a chave `refresh:<userId>`
([`auth.service.ts:134-142`](../src/modules/auth/auth.service.ts#L134-L142)).

Tokens podem ser revogados via `revokeToken`
([`auth.service.ts:107-115`](../src/modules/auth/auth.service.ts#L107-L115))
— grava `revoked:<token>` no cache com TTL default 3600 s.
`validateToken` checa antes de aceitar. Porém, `validateToken` **não é
chamado pelas guards inspecionadas**, então a revogação só tem efeito onde
for explicitamente invocada. **A confirmar** se há strategy/guard que use
esse método.

### 8.3 Unicidade de `email` e `cpf`

O schema marca ambos como `@unique`
([`schema.prisma:21,25`](../prisma/schema.prisma#L21)).
No service, o `try/catch` em `create` traduz o código `P2002` do Prisma para
`Error("Já existe um usuário com esse e-mail ou cpf")`
([`users.service.ts:59-63`](../src/modules/users/users.service.ts#L59-L63)).
