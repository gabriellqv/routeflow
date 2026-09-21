# @routeflow/web

Interface web do RouteFlow (Angular): autenticação, telas de CRUD, mapa em
tempo real (MapLibre) e controle da simulação.

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- API em execução (`npm run start:dev --workspace @routeflow/api`)

## Execução

```bash
# a partir da raiz do monorepo
npm run build:contracts
npm run start --workspace @routeflow/web
```

- App: `http://localhost:4200`
- API consumida: `http://localhost:3000` (configurável por `WEB_API_URL`)

## Scripts

| Script | Descrição |
|---|---|
| `npm run start --workspace @routeflow/web` | Servidor de desenvolvimento (`ng serve`) |
| `npm run build --workspace @routeflow/web` | Build de produção em `dist/` |
| `npm run typecheck --workspace @routeflow/web` | Checagem de tipos |
| `npm test --workspace @routeflow/web` | Testes unitários (Vitest) |

## Estrutura

```
src/app/
├── core/       # Cliente HTTP, sessão (JWT), interceptor e guard de rotas
├── features/   # Páginas: login, placeholder (CRUD/mapa/simulação nos próximos PRs)
├── layout/     # Shell autenticado (sidebar, topbar, conteúdo)
├── app.config.ts   # Providers globais (router, HTTP, zoneless)
├── app.routes.ts   # Rotas e proteção por authGuard
└── app.ts
```

## Autenticação

- A tela de login chama `POST /api/auth/login` e guarda o JWT no
  `localStorage` (via `AuthStore`).
- O `authInterceptor` anexa `Authorization: Bearer <token>` às requisições e
  limpa a sessão ao receber `401`.
- O `authGuard` protege a área autenticada e redireciona para `/login`
  preservando `returnUrl`.

## Configuração da API

A URL base é resolvida em runtime por `window.__env.API_URL`, com fallback para
`http://localhost:3000`. Para apontar para outra API em produção, sirva um
`env.js` que defina `window.__env`.

## Testes

```bash
npm test --workspace @routeflow/web
```

Testes unitários com [Vitest](https://vitest.dev/) via
`@angular/build:unit-test`.
