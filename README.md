# RouteFlow

Sistema de logística/transporte com simulação em tempo real de veículos.

Um simulador em Go movimenta os veículos pelas rotas publicando posições e
eventos no Redis; a API (NestJS) repassa as posições por WebSocket e processa os
eventos (filas BullMQ, histórico em PostGIS); o web (Angular + MapLibre) exibe o
mapa em tempo real e as telas de gestão.

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Angular + MapLibre |
| API | NestJS |
| Simulador | Go |
| Banco | PostgreSQL + PostGIS |
| Estado/comunicação rápida | Redis |
| Filas assíncronas | BullMQ |
| Tempo real | WebSocket (Socket.IO) |

## Estrutura

```
RouteFlow/
├── apps/
│   ├── api/          # NestJS (CRUD, auth, gateway WS, workers)
│   ├── web/          # Angular (CRUD, mapa, controle da simulação)
│   └── simulator/    # Go (movimento e eventos dos veículos)
├── packages/
│   └── contracts/    # tipos/enums/DTOs compartilhados
├── docs/             # visão geral, arquitetura, modelo, planos
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 24 (ver `.nvmrc`)
- Go 1.22+ (para o simulador; ver `apps/simulator/go.mod`)
- Docker + Docker Compose

## Como rodar (ponta a ponta)

```bash
# 1. Instalar dependências (também configura os hooks do Husky)
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Subir Postgres + PostGIS e Redis
npm run docker:up

# 4. Compilar os contratos compartilhados
npm run build:contracts

# 5. Aplicar migrations e popular o seed de demonstração
npm run migration:run --workspace @routeflow/api
npm run seed --workspace @routeflow/api
```

Em terminais separados:

```bash
# API (http://localhost:3000, Swagger em /api/docs)
npm run start:dev --workspace @routeflow/api

# Web (http://localhost:4200)
npm run start --workspace @routeflow/web

# Simulador (health/controle em http://localhost:8080)
cd apps/simulator && go run .
```

Acesse `http://localhost:4200` e entre com as credenciais do seed:

| E-mail | Senha |
|---|---|
| `admin@routeflow.com` | `admin123` |

O simulador autentica na API com as mesmas credenciais (`API_EMAIL`/
`API_PASSWORD`), carrega os veículos/rotas do seed e começa a movimentá-los. Em
`/map` os veículos aparecem se movendo; em `/simulation` é possível
iniciar/pausar/parar.

Para parar a infraestrutura: `npm run docker:down`.

## Scripts

| Script | Descrição |
|---|---|
| `npm run lint` | Roda o ESLint em todo o repositório |
| `npm run lint:fix` | Corrige problemas de lint automaticamente |
| `npm run format` | Formata com Prettier |
| `npm run format:check` | Verifica formatação sem alterar |
| `npm run typecheck` | Checagem de tipos de todos os workspaces |
| `npm run build:contracts` | Compila `packages/contracts` |
| `npm run start:dev --workspace @routeflow/api` | Sobe a API em modo watch |
| `npm run start --workspace @routeflow/web` | Sobe o web (Angular) em modo dev |
| `npm run migration:run --workspace @routeflow/api` | Aplica as migrations |
| `npm run seed --workspace @routeflow/api` | Popula o banco (demonstração) |
| `npm test --workspace @routeflow/api` | Testes unitários da API |
| `npm run test:e2e --workspace @routeflow/api` | Testes de integração da API |
| `npm test --workspace @routeflow/web` | Testes unitários do web |
| `npm run docker:up` / `docker:down` / `docker:logs` | Infraestrutura |

## Arquitetura em uma imagem

```
Simulador (Go) ──HSET/GEOADD/PUBLISH──► Redis ──subscribe──► API Gateway ──WS──► Web (Mapa)
      │                                    ▲
      └──XADD vehicles:events──────────────┘
                                           │
                        API consumer ◄─────┘──► BullMQ (deliveries/maintenance/notifications)
                              │                        └──► PostGIS (event_log, vehicle_positions)
```

Detalhes em [`docs/01-arquitetura.md`](./docs/01-arquitetura.md).

## Qualidade de código

- **ESLint** + **Prettier** configurados na raiz.
- **Husky**:
  - `pre-commit` → `lint-staged` (ESLint + Prettier apenas nos arquivos alterados).
  - `commit-msg` → valida Conventional Commits (`commitlint`).
  - `pre-push` → roda `typecheck`.
- **CI** (`.github/workflows/ci.yml`): lint, formatação, builds, migrations e
  testes (unitários com cobertura e integração para API; testes para o web; e
  `go test` + `go vet` para o simulador).
- **Cobertura**: pisos mínimos configurados no Vitest da API.

## Documentação

- [`docs/00-visao-geral.md`](./docs/00-visao-geral.md) — objetivo e escopo.
- [`docs/01-arquitetura.md`](./docs/01-arquitetura.md) — componentes e fluxos.
- [`docs/02-modelo-de-dados.md`](./docs/02-modelo-de-dados.md) — entidades.
- [`docs/03-contratos-e-estado.md`](./docs/03-contratos-e-estado.md) — contratos e Redis.
- [`docs/04-servicos.md`](./docs/04-servicos.md) — responsabilidades por serviço.
- [`docs/06-plano-de-implementacao-detalhado.md`](./docs/06-plano-de-implementacao-detalhado.md) — processo e PRs.
- [`CHANGELOG.md`](./CHANGELOG.md) — histórico de versões.
