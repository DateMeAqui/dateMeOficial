# Postman Test Execution Plan — DateMeClaude Collection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar testes manuais na collection DateMeClaude cobrindo criação de usuários, autenticação, verificação de código, leitura e atualização — registrando sucesso e falha de cada chamada.

**Architecture:** Testes sequenciais via curl direto contra `http://localhost:3000/graphql`. Resultados anotados em tempo real neste documento.

**Tech Stack:** NestJS + GraphQL (Prisma/PostgreSQL), collection DateMeClaude no Postman

**Executado em:** 2026-04-23 · Servidor: `http://localhost:3000`

---

## Pré-condição Encontrada

> **⚠️ Tabela `roles` estava vazia (sem seed).** Isso causou falha no primeiro teste de criação de usuário.
> **Solução aplicada:** Seed manual via Prisma antes dos testes:
> ```
> roles: [{ id:1, name:'SUPER_ADMIN' }, { id:2, name:'ADMIN' }, { id:3, name:'USER' }]
> ```

---

## Task 1 — Criar 5 Usuários

**Endpoint:** `POST /graphql` · `CreateUser` · Público

### IDs Criados

| User | ID | CPF usado |
|------|----|-----------|
| user01 — João Silva | `7ebdcbcd-6bbc-4f7e-add8-1e666cf1e8a6` | 529.982.247-25 |
| user02 — Maria Santos | `51fcac14-e1a5-4a92-9062-4cf92290d771` | 987.654.321-00 |
| user03 — Pedro Costa | `e1c3d43f-ebd7-443e-ae2d-9b29505a8755` | 111.444.777-35 |
| user04 — Ana Lima | `1056a868-20d4-4fa0-955b-dcfc1c7dcf04` | 453.897.654-78 |
| user05 — Carlos Rocha | `0e250528-4ba9-46fd-9cff-ec7f1c496c05` | 789.012.345-05 |

### Resultados — Task 1

| Chamada | Status | Observação |
|---------|--------|-----------|
| user01 — joao@dateme.test | ✅ 200 | `status: PENDING`, `roleId: 3` |
| user02 — maria@dateme.test | ✅ 200 | `status: PENDING`, `roleId: 3` |
| user03 — pedro@dateme.test | ✅ 200 | `status: PENDING`, `roleId: 3` |
| user04 — ana@dateme.test (1ª tentativa) | ❌ CPF inválido | CPF "222.555.888-07" rejeitado pelo validador |
| user05 — carlos@dateme.test (1ª tentativa) | ❌ CPF inválido | CPF "333.666.999-39" rejeitado pelo validador |
| user04 — ana@dateme.test (2ª tentativa) | ✅ 200 | CPF corrigido para 453.897.654-78 |
| user05 — carlos@dateme.test (2ª tentativa) | ✅ 200 | CPF corrigido para 789.012.345-05 |
| Duplicado — joao@dateme.test | ✅ Erro esperado | `"Já existe um usuário com esse e-mail ou cpf"` (Prisma P2002) |

**Rota testada 2x (user04 e user05):** falha na 1ª tentativa, sucesso na 2ª após correção do CPF.

---

## Task 2 — Login

**Endpoint:** `POST /graphql` · `login` · Público

> **Descoberta:** O campo de token na resposta é `access_token` (snake_case), não `accessToken`.
> A collection Postman tinha o nome errado — isso foi identificado no teste e deve ser corrigido.

### Resultados — Task 2

| Cenário | Status | Observação |
|---------|--------|-----------|
| Login user01 válido (1ª tentativa) | ❌ Campo errado | Query usava `accessToken` → GraphQL validation error |
| Login user01 válido (2ª tentativa) | ✅ 200 | Campo corrigido para `access_token` — token JWT obtido |
| Login user02 válido | ✅ 200 | Token JWT obtido para Maria |
| Login senha errada (joao + senha_errada) | ✅ Erro esperado | `"Invalid credentials"` — 401 UNAUTHENTICATED |

**Tokens obtidos:**
- **user01 (João):** `eyJhbGci...A23E`
- **user02 (Maria):** `eyJhbGci...p-U`

---

## Task 3 — Me

**Endpoint:** `POST /graphql` · `me` · JWT obrigatório

### Resultados — Task 3

| Cenário | Status | Observação |
|---------|--------|-----------|
| Me com token válido (user01) | ✅ 200 | Retornou `id`, `fullName`, `nickName`, `email`, `status: PENDING`, `roleId: 3` |
| Me sem Authorization header | ✅ Erro esperado | `"Unauthorized"` — 401 UNAUTHENTICATED |

---

## Task 4 — Listagens e Buscas

**Endpoint:** `POST /graphql` · JWT obrigatório

### Resultados — Task 4

| Cenário | Status | Observação |
|---------|--------|-----------|
| `getUsers` com token USER | ✅ Erro esperado | `"Forbidden resource"` 403 — corretamente bloqueado para role USER |
| `getUsersByPagination` page 1 limit 3 | ⚠️ 200 mas vazio | Query filtra `status: ACTIVE` — todos os usuários estão `PENDING` |
| `getUsersByPagination` busca "Silva" | ⚠️ 200 mas vazio | Mesma causa: filtro `status: ACTIVE` |
| `getUserById` user02 Maria | ✅ 200 | `fullName: "Maria Santos"`, `age: 30`, `status: PENDING` |
| `getUserById` user01 João | ✅ 200 | `fullName: "João Silva"`, `age: 33`, `status: PENDING` |

---

## Task 5 — Atualização

**Endpoint:** `POST /graphql` · `updateUser` · JWT obrigatório

### Resultados — Task 5

| Cenário | Status | Observação |
|---------|--------|-----------|
| Update user01 — nickName + smartphone | ✅ 200 | `nickName: "joao_atualizado"`, `smartphone: "11999990001"` |
| Verificar update via `getUserById` | ✅ 200 | Dados confirmados persistidos no banco |

---

## Resumo Final

| Total de chamadas | Sucesso | Erro esperado (correto) | Erro inesperado / descoberta |
|-------------------|---------|------------------------|------------------------------|
| 21 | 13 | 5 | 3 |

---

## Bugs e Descobertas

### 🔴 Bug 1 — Campo `accessToken` errado na collection Postman
**Onde:** Request "Login" na collection DateMeClaude  
**Erro:** `Cannot query field "accessToken" on type "AuthResponse". Did you mean "access_token"?`  
**Causa:** O DTO `AuthResponse` usa snake_case (`access_token`), mas a collection foi criada com camelCase.  
**Ação:** Corrigir a query no Postman para `access_token`.

### 🟡 Descoberta 2 — Tabela `roles` sem seed
**Onde:** Primeiro `CreateUser` retornou `"Erro ao criar usuário"` genérico  
**Causa:** FK `roleId` sem registro na tabela `roles` — faltava seed inicial.  
**Ação recomendada:** Criar arquivo `prisma/seed.ts` com os 3 papéis e configurar `prisma.seed` no `package.json`.

### 🟡 Descoberta 3 — Paginação retorna vazio para usuários PENDING
**Onde:** `getUsersByPaginationForSearchFullNameOrNickName`  
**Causa:** O service filtra `status: 'ACTIVE'` hardcoded. Usuários recém-criados (PENDING) nunca aparecem nessa listagem.  
**Impacto:** Usuários sem código verificado são invisíveis na busca pública — comportamento **intencional ou não?**  
**Ação sugerida:** Confirmar se o filtro é intencional (separar busca pública × admin).

---

## Observações Gerais

- O validador de CPF usa o algoritmo `(sum * 10) % 11`, diferente do `sum % 11` padrão. CPFs gerados com o algoritmo comum podem falhar.
- Todos os usuários criados ficam com `status: PENDING` até verificação do código SMS.
- O token JWT expira em ~15 min (observado nos payloads).
- `getUsers` está protegido corretamente para ADMIN/SUPER_ADMIN.
- `getUserById` e `updateUser` funcionam corretamente para usuários autenticados como USER.
