# Spec — Documentação completa do projeto "Date - Me Encontre Aqui"

**Data:** 2026-04-16
**Branch:** `docs/modules-documentation`
**Autor:** DioenDJS (via Claude Code, skill `superpowers:brainstorming`)
**Status:** aprovado pelo usuário nas 5 seções do design

---

## 1. Contexto

`Date - Me Encontre Aqui` é um backend NestJS + GraphQL (Apollo, code-first) com Prisma/Postgres, integrado a AWS (S3, SQS, SNS, Secrets Manager, SSM), GCP (Pub/Sub), PagSeguro (pagamentos), Twilio/TeleSign (SMS), LangChain/LangGraph + Ollama (IA para moderação de posts) e Redis. Organiza-se em 18 módulos NestJS dentro de `src/modules/`, mais diretórios de integração `src/aws/`, `src/llm-service/` e utilitários em `src/utils/` e `src/modules/common/`.

Hoje não existe documentação técnica. O único artefato é o `README.md` raiz (vitrine). O objetivo deste spec é produzir documentação exaustiva, em pt-BR, sem alterar nenhuma linha de código de produção.

## 2. Objetivo

Entregar:

1. Um conjunto de 6 documentos transversais em `docs/`.
2. Um `README.md` dentro de **cada** módulo em `src/modules/*/`.
3. Um `README.md` em `src/aws/` e `src/llm-service/`.
4. Precisão: toda afirmação técnica baseada em leitura do código. Itens não verificáveis marcados explicitamente como "a confirmar".

## 3. Decisões aprovadas pelo usuário

| Decisão | Escolha |
|---|---|
| Localização dos docs de módulo | `src/modules/<mod>/README.md` (junto ao código) + índice em `docs/` |
| Idioma | pt-BR |
| Profundidade | Exaustiva (nível C): ~500+ linhas, com exemplos, diagramas Mermaid e fluxos |
| Nome da branch | `docs/modules-documentation` |

## 4. Escopo

### 4.1 Incluído

- 6 docs transversais em `docs/`:
  - `README.md` — índice + sumário executivo + glossário.
  - `architecture.md` — arquitetura C4 nível 2 + camadas internas.
  - `business-rules.md` — regras de negócio atravessando módulos.
  - `data-model.md` — ERD completo + tabela por entidade.
  - `infrastructure.md` — Dockerfile, Terraform, Makefile, variáveis de ambiente.
  - `conventions.md` — padrões de código e estrutura.
- 18 READMEs de módulos em `src/modules/*/README.md`:
  `addresses`, `assistant_ai`, `auth`, `comments`, `complaints`, `gcp`, `pag-seguro`, `payments`, `plans`, `posts`, `prisma`, `reporting`, `roles`, `sms`, `subscriptions`, `subscription-status`, `upload-medias`, `users`.
  - Obs.: `common/` receberá um README pequeno descrevendo utilitários compartilhados.
  - Obs.: `n8n-agent/` contém apenas um arquivo JSON de workflow (`Assistente de analise de postagens.json`). Será documentado como subseção dentro do README do `assistant_ai` (pertinência temática), sem README próprio. Motivo: não há código TypeScript para documentar as 11 seções do template.
- 2 READMEs de raiz: `src/aws/README.md` e `src/llm-service/README.md`.

### 4.2 Fora de escopo

- Nenhuma alteração em `.ts`, `.js`, `.prisma`, `.tf`, `Dockerfile`, `Makefile`, `package.json` etc.
- Sem tradução para outros idiomas.
- Sem site de documentação (MkDocs, Docusaurus).
- Sem geração automática a partir do schema — tudo escrito à mão, conferido contra o código.
- Sem alteração do `README.md` raiz.

## 5. Template obrigatório do README de módulo

Todo `src/modules/<mod>/README.md` segue as 11 seções abaixo. Seções inaplicáveis ficam com _"Não se aplica"_ em vez de removidas.

1. **Propósito** — papel do módulo no domínio.
2. **Regras de Negócio** — invariantes, restrições, efeitos colaterais.
3. **Entidades e Modelo de Dados** — campos Prisma, relacionamentos, `erDiagram` Mermaid.
4. **API GraphQL** — tabela de queries/mutations/subscriptions com args, retorno, auth, descrição.
5. **DTOs e Inputs** — campos, validators (class-validator), observações.
6. **Fluxos Principais** — passo-a-passo + `sequenceDiagram` Mermaid por fluxo crítico.
7. **Dependências** — módulos internos importados, integrações externas, variáveis de ambiente, módulos que consomem este.
8. **Autorização e Papéis** — guards, roles, decorators.
9. **Erros e Exceções** — erros lançados, quando, mensagens.
10. **Pontos de Atenção / Manutenção** — débitos, limitações, TODOs evidentes.
11. **Testes** — arquivos `.spec.ts` existentes e cobertura resumida.

## 6. Conteúdo dos docs transversais

### `docs/README.md`
- Sumário executivo (propósito da plataforma em um parágrafo).
- Tabela com link para cada módulo + docs auxiliares.
- Seção "Como navegar".
- Glossário (Plan, Subscription, Ultimate, Complaint, Match, Role).

### `docs/architecture.md`
- Diagrama Mermaid flowchart C4 nível 2: cliente → Apollo/GraphQL → NestJS → Prisma/Postgres + integrações externas.
- Camadas internas: Resolver → Service → Prisma/Integrações.
- Autenticação (JWT + Passport + Roles).
- Modo de execução (monolito modular NestJS code-first).

### `docs/business-rules.md`
- Ciclo de vida do usuário (PENDING → ATIVO, `verificationCode` via SMS).
- Papéis e hierarquia.
- Modelo de assinatura (Plan + Subscription + SubscriptionStatus + Payment).
- Ultimate como gate para conteúdo pago (Post).
- Moderação (Complaint sobre Post/Comment + análise IA).
- Soft-delete (`deletedAt`).

### `docs/data-model.md`
- ERD Mermaid completo (11 modelos do `schema.prisma`).
- Tabela por entidade (PK, FKs, campos críticos).

### `docs/infrastructure.md`
- `Dockerfile`, `docker-compose.yml`, `Makefile`, `ollama-entrypoint.sh`.
- Terraform (`main.tf`, `queue.tf`, `provider.tf`, `variables.tf`, `tfenvs/`).
- Requisitos (Postgres, Redis, Node).
- Tabela consolidada de variáveis de ambiente (levantada via grep em `src/`).

### `docs/conventions.md`
- Estrutura padrão do módulo NestJS.
- Padrões (class-validator, GraphQL code-first, Prisma, JWT guard).
- Paginação (`common/pagination.input.ts`).
- Lint, Prettier, TSConfig.
- Como rodar testes.

## 7. Metodologia de levantamento (anti-alucinação)

Para cada módulo:

1. Ler `*.module.ts` → `imports`, `providers`, `controllers`, `exports`.
2. Ler `*.resolver.ts` / `*.controller.ts` → queries, mutations, rotas REST, guards, roles.
3. Ler `*.service.ts` → regras de negócio, chamadas externas, `process.env.*`, exceções.
4. Ler `dto/` e `entities/` → inputs, tipos, validators.
5. Ler `*.spec.ts` → cobertura de testes existente.
6. Grep reverso: quem importa este módulo (seção 7 do template).
7. Conferir entidades no `schema.prisma`.

**Regra:** se uma afirmação não for verificável no código, marca-se com `> ⚠️ **A confirmar:** <motivo>`. Não se infere regra de negócio a partir de nome de variável.

**Diagramas:** `erDiagram` para dados, `sequenceDiagram` para fluxos, `flowchart` para arquitetura.

## 8. Ordem de execução

1. Branch `docs/modules-documentation` (já criada).
2. Spec (este arquivo) + commit.
3. Docs transversais em `docs/` nesta ordem:
   `README.md` → `architecture.md` → `data-model.md` → `business-rules.md` → `conventions.md` → `infrastructure.md`.
4. READMEs de módulos ordenados por dependência (base → consumidores):
   `prisma`, `common`, `roles`, `sms`, `addresses`, `users`, `auth`, `plans`, `subscription-status`, `subscriptions`, `pag-seguro`, `payments`, `posts`, `comments`, `complaints`, `upload-medias`, `gcp`, `assistant_ai`, `reporting`.
5. READMEs de raiz: `src/aws/README.md`, `src/llm-service/README.md`.
6. Commits agrupados logicamente (1 commit por doc transversal; 1 commit por módulo ou grupo pequeno).

## 9. Critérios de conclusão (verificação)

Antes de declarar pronto, invocar `superpowers:verification-before-completion` e rodar:

- `find docs -name "*.md"` → confere existência de 6 arquivos em `docs/` (+ o spec).
- `find src -name "README.md"` → confere existência em 18 módulos + `src/aws/` + `src/llm-service/` + `src/modules/common/` (total esperado: 21 READMEs).
- Em cada README de módulo: grep por `^## 1\.`, `^## 2\.`, …, `^## 11\.` → todas as 11 seções presentes.
- `git diff --stat main...HEAD -- '*.ts' '*.prisma' '*.tf' '*.json' 'Dockerfile' 'Makefile'` → deve retornar vazio (nenhum código alterado).
- Inspeção de blocos Mermaid (sintaxe): nenhum bloco vazio.

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Documentar comportamento que não existe ainda no código (alucinar) | Regra "só documento o que li"; marcar com `⚠️ A confirmar` quando dúbio |
| Docs ficarem desatualizados com o tempo | Fora do escopo desta entrega. Recomendar no `conventions.md` que PRs que alterem um módulo atualizem o README correspondente |
| Diagramas Mermaid com erro de sintaxe | Validar sintaxe olhando cada bloco após escrever; preview local se possível |
| Volume grande (≈23 arquivos) travar em uma só conversa | O plano de implementação (próximo passo) quebra a execução em etapas independentes |

## 11. Próximos passos após aprovação do spec

1. Usuário revisa este spec.
2. Invocar `superpowers:writing-plans` para gerar o plano de implementação passo-a-passo.
3. Executar o plano (módulo por módulo) na branch `docs/modules-documentation`.
4. Ao término, usar `superpowers:finishing-a-development-branch` para decidir merge/PR.
