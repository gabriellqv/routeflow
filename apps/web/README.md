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
├── core/       # Cliente HTTP, sessão (JWT), interceptor, guard, base de CRUD, tempo real e config do simulador
├── features/   # login, vehicles, drivers, routes, deliveries, maintenance, map, simulation
├── layout/     # Shell autenticado (sidebar, topbar, conteúdo)
├── app.config.ts   # Providers globais (router, HTTP, zoneless)
├── app.routes.ts   # Rotas e proteção por authGuard
└── app.ts
```

## Mapa em tempo real

A feature `map` usa [MapLibre GL JS](https://maplibre.org/) para renderizar o
mapa base (tiles raster configuráveis), desenhar os traçados das rotas e os
veículos recebidos via WebSocket.

- `RealtimeService` conecta ao gateway `/ws` (JWT no handshake), assina
  `vehicle_positions` e `vehicle_event`, e mantém o estado por `vehicle_id` em
  signals (com reconexão automática do `socket.io-client`).
- Cada veículo é colorido pelo `status` (`in_route`, `stopped`, `fault`,
  `maintenance`); clicar em um veículo abre um popup com os dados.

## Controle da simulação

A feature `simulation` chama o endpoint `POST /control` do simulador Go
(`start`/`pause`/`stop`) e exibe o estado atual. A URL do simulador é
configurável por `window.__env.SIMULATOR_URL` (padrão `http://localhost:8080`).

## Módulos de CRUD

As telas de CRUD (veículos, motoristas, rotas, entregas e manutenções) usam a
base `CrudBase` + `ResourceService`, que padronizam listagem, criação, edição e
remoção sobre os endpoints da API (`/api/vehicles`, `/api/drivers`,
`/api/routes`, `/api/deliveries`, `/api/maintenance`). Os formulários são
reativos e espelham a validação dos DTOs.

## Autenticação

- A tela de login chama `POST /api/auth/login` e guarda o JWT no
  `localStorage` (via `AuthStore`). O administrador de demonstração é criado pelo
  seed da API (`admin@routeflow.com` / `admin123`).
- O `authInterceptor` anexa `Authorization: Bearer <token>` às requisições e
  limpa a sessão ao receber `401`.
- O `authGuard` protege a área autenticada e redireciona para `/login`
  preservando `returnUrl`.

## Configuração da API

A URL base é resolvida em runtime por `window.__env.API_URL`, com fallback para
`http://localhost:3000`. Para apontar para outra API em produção, sirva um
`env.js` que defina `window.__env` (ver `public/env.js`):

| Chave | Descrição | Padrão |
|---|---|---|
| `API_URL` | URL base da API | `http://localhost:3000` |
| `WS_URL` | URL do gateway WebSocket | derivada de `API_URL` (troca `http→ws`) |
| `MAP_TILES_URL` | Template de tiles do mapa | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `SIMULATOR_URL` | URL base do simulador Go | `http://localhost:8080` |

## Testes

```bash
npm test --workspace @routeflow/web
```

Testes unitários com [Vitest](https://vitest.dev/) via
`@angular/build:unit-test`.
