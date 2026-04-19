# Profile & Preferences — Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar a verificação final do módulo Profile implementado (Task 17 do plano original).

**Tech Stack:** NestJS 11, GraphQL (code-first), Prisma 6, Jest

**Spec:** [`../specs/2026-04-19-profile-preferences-verification-design.md`](../specs/2026-04-19-profile-preferences-verification-design.md)

**Branch:** `feat/profile-preferences-verification`

---

## Task 1: Executar testes do módulo Profile

- [ ] **Step 1: Executar testes específicos do Profile**

```bash
npm run test -- profile
```

Esperado: 26 testes passando (profile.service.spec.ts, profile.resolver.spec.ts, create-profile.input.spec.ts).

- [ ] **Step 2: Documentar resultado**

Se testes passam, marcar como ✅.

---

## Task 2: Executar build

- [ ] **Step 1: Executar build**

```bash
npm run build
```

Esperado: `nest build` completa sem erros TypeScript.

- [ ] **Step 2: Verificar saída**

Se build passa, marcar como ✅.

---

## Task 3: Verificar schema GraphQL

- [ ] **Step 1: Verificar arquivo schema**

```bash
ls -la src/schema.gql
```

- [ ] **Step 2: Verificar presença de tipos** (se gerado)

```bash
grep -E "type Profile|enum Gender|myProfile|updateMyProfile" src/schema.gql
```

**Nota:** O schema pode não ter sido gerado por causa de erros em runtime. Isso não indica falha do módulo Profile.

---

## Task 4: Criar arquivo de fase (lessons learned)

- [ ] **Step 1: Criar arquivo de fase**

Criar `docs/superpowers/phases/2026-04-19-profile-preferences-verification.md` com:
- O que foi implementado
- Dores/dificuldades enfrentadas
- Problemas encontrados
- Soluções aplicadas
- Lições aprendidas

---

## Task 5: Commits

- [ ] **Step 1: commitar design.md**

```bash
git add docs/superpowers/specs/2026-04-19-profile-preferences-verification-design.md
gitmoji -c
```

Escolher: `:memo:`. Título: `docs(specs): add verification design for Profile module`.

- [ ] **Step 2: commitar plano**

```bash
git add docs/superpowers/plans/2026-04-19-profile-preferences-verification.md
gitmoji -c
```

Escolher: `:memo:`. Título: `docs(plans): add verification implementation plan`.

- [ ] **Step 3: commitar arquivo de fase**

```bash
git add docs/superpowers/phases/2026-04-19-profile-preferences-verification.md
gitmoji -c
```

Escolher: `:books:`. Título: `docs(phase): add verification phase lessons learned`.

---

## Task 6: Push e PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/profile-preferences-verification
```

- [ ] **Step 2: Criar PR com skill**

Usar skill `github-pull-request-expert` para criar Pull Request com descrição completa.

---

## Verification Checklist

- [ ] 26 testes de Profile passando
- [ ] Build completa sem erros
- [ ] Arquivo de fase criado
- [ ] PR aberto para `main`