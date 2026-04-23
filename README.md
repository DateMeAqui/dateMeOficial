<h1 align="center">Date - Me Encontre Aqui</h1>

<p align="center">
    <img src="https://img.shields.io/static/v1?label=DioenD&message=node&color=d2cca1&labelColor=757780" alt="DioenD">
    <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/DioenDJS/Backend-for-Frontend-NextJS">
</p>

API de uma plataforma de encontros para adultos com match, bate-papo e venda de conteúdos exclusivos para assinantes.

---

## Tecnologias

<p>
  <img align="center" alt="Node" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-plain-wordmark.svg" /> Node.js &nbsp;
  <img align="center" alt="NestJS" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nestjs/nestjs-original.svg" /> NestJS &nbsp;
  <img align="center" alt="Prisma" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original.svg" /> Prisma &nbsp;
  <img align="center" alt="PostgreSQL" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-plain.svg" /> PostgreSQL &nbsp;
  <img align="center" alt="Docker" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-plain.svg" /> Docker &nbsp;
  <img align="center" alt="GraphQL" height="40" width="45" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/graphql/graphql-plain.svg" /> GraphQL
</p>

---

## Pré-requisitos

- Node.js >= 18
- npm >= 9
- PostgreSQL rodando (local ou via Docker)
- Redis rodando (local ou via RedisLabs)

---

## Configuração do ambiente

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do PostgreSQL. Ex: `postgresql://user:pass@localhost:5432/dateme` |
| `REDIS_HOST` | Host do Redis |
| `REDIS_PORT` | Porta do Redis (padrão: `6379`) |
| `REDIS_PASSWORD` | Senha do Redis |
| `REDIS_PRIVATE_URL` | URL completa do Redis (alternativa ao host/port/password) |
| `JWT_SECRET` | Chave secreta do access token |
| `JWT_REFRESH_SECRET` | Chave secreta do refresh token |
| `JWT_EXPIRES_IN` | Expiração do access token. Ex: `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token. Ex: `7d` |
| `TELESIGN_CUSTOMER_ID` | Customer ID do TeleSign (envio de SMS) |
| `TELESIGN_API_KEY` | API Key do TeleSign |
| `PORT` | Porta da aplicação (padrão: `3000`) |
| `ENV` | Ambiente: `development` ou `production` |

---

## Instalação

```bash
npm install
```

---

## Banco de dados

### Rodar as migrations

Aplica todas as migrations e sincroniza o schema com o banco:

```bash
npx prisma migrate deploy
```

Em desenvolvimento, use `dev` para criar novas migrations a partir de mudanças no schema:

```bash
npx prisma migrate dev
```

### Rodar o seed

Popula dados obrigatórios (tabela `roles`). **Execute uma vez após a primeira migration.**

```bash
npx prisma db seed
```

Saída esperada:

```
Seed concluído: roles SUPER_ADMIN, ADMIN, USER criadas.
```

> O seed usa `upsert` — é seguro rodar mais de uma vez sem duplicar dados.

---

## Rodando o projeto

### Desenvolvimento (com hot reload)

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API estará disponível em `http://localhost:3000/graphql`.
O GraphQL Playground também fica acessível nessa URL em modo `development`.

---

## Testes

### Unitários e de integração

```bash
npm run test
```

### Watch mode (re-executa ao salvar)

```bash
npm run test:watch
```

### Cobertura de código

```bash
npm run test:cov
```

Relatório gerado em `coverage/`.

### End-to-end

```bash
npm run test:e2e
```

---

## Collection Postman

A collection **DateMeClaude** cobre todos os endpoints do módulo Users:

| Request | Tipo | Auth |
|---------|------|------|
| Register User | Mutation `CreateUser` | Público |
| Login | Mutation `login` | Público |
| Verify Code | Mutation `verificationCode` | Bearer token |
| Me | Query `me` | Bearer token |
| Get All Users | Query `getUsers` | Bearer token (ADMIN+) |
| Get Users Paginated | Query `getUsersByPagination` | Bearer token |
| Get User By Id | Query `getUserById` | Bearer token |
| Update User | Mutation `updateUser` | Bearer token |
| Soft Delete User | Mutation `softDeleted` | Bearer token |
| Hard Delete User | Mutation `deletedUser` | Bearer token (ADMIN+) |

**Fluxo básico:**
1. **Register User** — cria o usuário com `status: PENDING` e envia código via SMS
2. **Login** — o script de teste salva o `access_token` automaticamente em `{{token}}`
3. **Verify Code** — valida o código recebido no SMS, status muda para `ACTIVE`
4. Os demais endpoints usam `{{token}}` automaticamente via variável de collection

---

## Estrutura principal

```
src/
├── modules/
│   ├── auth/        # JWT, login, logout, guards
│   ├── users/       # CRUD de usuários
│   ├── profile/     # Perfil, gênero, preferências, galeria
│   ├── media/       # Upload de mídias (avatar, galeria)
│   ├── prisma/      # PrismaService
│   └── ...
prisma/
├── schema.prisma    # Schema do banco
├── seed.ts          # Seed de dados obrigatórios (roles)
└── migrations/      # Histórico de migrations
```
