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
| `npm test --workspace @routeflow/api` | Testes unitários |
| `npm run test:e2e --workspace @routeflow/api` | Testes de integração (requer Postgres e Redis) |

## Estrutura

```
src/
├── config/     # Configuração tipada e validação das variáveis de ambiente
├── database/   # Conexão com PostgreSQL (TypeORM)
├── redis/      # Cliente Redis (ioredis) e ciclo de vida
├── health/     # Health check (Terminus)
├── app.module.ts
├── setup-app.ts  # Prefixo global, CORS e Swagger
└── main.ts
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP (padrão `3000`) |
| `DATABASE_URL` | URL do PostgreSQL |
| `REDIS_URL` | URL do Redis |
| `JWT_SECRET` | Segredo de assinatura dos tokens (mín. 16 caracteres) |
