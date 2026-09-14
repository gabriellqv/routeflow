# @routeflow/api

API do RouteFlow (NestJS): regras de negócio, autenticação, CRUD de domínio e
gateway em tempo real.

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- PostgreSQL + PostGIS e Redis em execução (`npm run docker:up` na raiz)

## Execução

```bash
# a partir da raiz do monorepo
cp .env.example .env
npm run docker:up
npm run migration:run --workspace @routeflow/api
npm run start:dev --workspace @routeflow/api
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

## Scripts

| Script | Descrição |
|---|---|
| `npm run start:dev --workspace @routeflow/api` | Sobe em modo watch |
| `npm run build --workspace @routeflow/api` | Compila para `dist/` |
| `npm run typecheck --workspace @routeflow/api` | Checagem de tipos |
| `npm run migration:run --workspace @routeflow/api` | Aplica as migrations pendentes |
| `npm run migration:revert --workspace @routeflow/api` | Reverte a última migration |
| `npm test --workspace @routeflow/api` | Testes unitários |
| `npm run test:e2e --workspace @routeflow/api` | Testes de integração (requer Postgres e Redis) |

## Estrutura

```
src/
├── auth/       # Autenticação (JWT): cadastro, login e guarda de rotas
├── config/     # Configuração tipada e validação das variáveis de ambiente
├── database/   # Conexão com PostgreSQL (TypeORM) e migrations
├── redis/      # Cliente Redis (ioredis) e ciclo de vida
├── health/     # Health check (Terminus)
├── users/      # Entidade e serviços de usuários
├── app.module.ts
├── setup-app.ts  # Prefixo global, validação, CORS e Swagger
└── main.ts
```

## Migrations

As migrations ficam em `src/database/migrations` e são aplicadas
automaticamente na inicialização (`migrationsRun`). Para gerar uma nova:

```bash
npm run migration:generate --workspace @routeflow/api -- src/database/migrations/NomeDaMigration
```

## Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastra um usuário e retorna um token |
| POST | `/api/auth/login` | Autentica e retorna um token |
| GET | `/api/auth/me` | Retorna o usuário autenticado (Bearer) |

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP (padrão `3000`) |
| `DATABASE_URL` | URL do PostgreSQL |
| `REDIS_URL` | URL do Redis |
| `JWT_SECRET` | Segredo de assinatura dos tokens (mín. 16 caracteres) |
