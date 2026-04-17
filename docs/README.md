# Documentação — Date: Me Encontre Aqui

Plataforma de encontros adultos (NestJS 11 + GraphQL Apollo code-first + Prisma/Postgres)
com bate-papo, sistema de assinaturas (planos pagos via PagSeguro) e venda de conteúdo
para assinantes Ultimate.

## Como navegar

1. Comece por [`architecture.md`](./architecture.md) para a visão geral (diagrama C4 e camadas).
2. Veja [`data-model.md`](./data-model.md) para o ERD.
3. Leia [`business-rules.md`](./business-rules.md) para regras de negócio que atravessam módulos.
4. Consulte [`infrastructure.md`](./infrastructure.md) para Docker, Terraform e variáveis de ambiente.
5. Para padrões de código e estrutura de módulo, veja [`conventions.md`](./conventions.md).
6. Para um módulo específico, abra `src/modules/<mod>/README.md` (links na tabela abaixo).

## Índice

### Documentos transversais

| Doc | Assunto |
| --- | --- |
| [architecture.md](./architecture.md) | Arquitetura C4 nível 2, camadas internas, bootstrap |
| [data-model.md](./data-model.md) | ERD Mermaid e tabelas por entidade do Prisma |
| [business-rules.md](./business-rules.md) | Regras de negócio que cruzam módulos |
| [infrastructure.md](./infrastructure.md) | Docker, Terraform, Makefile, variáveis de ambiente |
| [conventions.md](./conventions.md) | Padrões de código, estrutura de módulo, testes, lint |

### Módulos NestJS (`src/modules/`)

| Módulo | Doc | Papel principal |
| --- | --- | --- |
| addresses | [README](../src/modules/addresses/README.md) | Endereço 1:1 com usuário |
| assistant_ai | [README](../src/modules/assistant_ai/README.md) | Análise de conteúdo via Anthropic SDK |
| auth | [README](../src/modules/auth/README.md) | Login, JWT, roles, refresh, reset de senha |
| comments | [README](../src/modules/comments/README.md) | Comentários com respostas aninhadas |
| common | [README](../src/modules/common/README.md) | Inputs e validadores compartilhados |
| complaints | [README](../src/modules/complaints/README.md) | Denúncias sobre posts/comentários |
| gcp | [README](../src/modules/gcp/README.md) | Integração Google Cloud (Pub/Sub, storage) |
| pag-seguro | [README](../src/modules/pag-seguro/README.md) | Gateway PagSeguro (cobrança, webhook) |
| payments | [README](../src/modules/payments/README.md) | Registros de pagamento |
| plans | [README](../src/modules/plans/README.md) | Catálogo de planos de assinatura |
| posts | [README](../src/modules/posts/README.md) | Publicações e gate Ultimate |
| prisma | [README](../src/modules/prisma/README.md) | Cliente Prisma injetado |
| reporting | [README](../src/modules/reporting/README.md) | Relatórios internos |
| roles | [README](../src/modules/roles/README.md) | Papéis do sistema |
| sms | [README](../src/modules/sms/README.md) | Envio de SMS (Telesign) |
| subscriptions | [README](../src/modules/subscriptions/README.md) | Assinaturas ativas |
| subscription-status | [README](../src/modules/subscription-status/README.md) | Catálogo de estados de assinatura |
| upload-medias | [README](../src/modules/upload-medias/README.md) | Upload de mídia |
| users | [README](../src/modules/users/README.md) | Ciclo de vida do usuário |

### Diretórios raiz documentados

| Pasta | Doc |
| --- | --- |
| `src/aws/` | [README](../src/aws/README.md) |
| `src/llm-service/` | [README](../src/llm-service/README.md) |

## Glossário

- **Plan** — produto de assinatura (ex.: Free, Ultimate). Preço armazenado em centavos.
- **Subscription** — vínculo ativo entre `User` e `Plan`.
- **SubscriptionStatus** — catálogo de estados possíveis da assinatura.
- **Payment** — registro de cobrança; referencia sempre `User`, `Plan` e `Subscription`.
- **Ultimate** — nível de assinatura que libera conteúdo pago (posts restritos).
- **Complaint** — denúncia sobre `Post` ou `Comment`, passível de análise por IA.
- **Match** — conexão entre dois usuários (conferir implementação atual).
- **Role** — papel do usuário (ex.: `USER`, `ADMIN`, `SUPER_ADMIN`). Ver `src/modules/users/enums/role.enum.ts`.
- **Soft-delete** — exclusão lógica via `deletedAt`; o Prisma não filtra automaticamente, cada service é responsável por excluir registros apagados das consultas.

## Princípio desta documentação

Tudo aqui foi extraído lendo o código-fonte em 2026-04-16/17 (branch `docs/modules-documentation`).
Itens duvidosos aparecem com o marcador `> ⚠️ **A confirmar**`. Regras de negócio
documentadas estão referenciadas pelo arquivo e linha onde foram observadas.
