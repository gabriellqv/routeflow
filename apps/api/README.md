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
├── common/     # Utilitários compartilhados (mappers, validadores)
├── config/     # Configuração tipada e validação das variáveis de ambiente
├── database/   # Conexão com PostgreSQL (TypeORM) e migrations
├── deliveries/ # Entidade, CRUD e serviços de entregas (paradas)
├── drivers/    # Entidade, CRUD e serviços de motoristas
├── events/     # Consumer da stream de eventos -> BullMQ (notifications/deliveries/maintenance)
├── maintenance/ # Entidade, CRUD e serviços de manutenções
├── positions/  # Histórico de posições (PostGIS) e log de eventos
├── queue/      # Configuração global do BullMQ (conexão Redis)
├── workers/    # Workers BullMQ (entregas, manutenção, notificações e snapshots)
├── routes/     # Entidade, CRUD de rotas com geometria PostGIS
├── vehicles/   # Entidade, CRUD e serviços de veículos
├── redis/      # Cliente Redis (ioredis) e ciclo de vida
├── realtime/   # Gateway WebSocket (posições em tempo real)
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

## Seed

Para popular o banco com veículos, motoristas, rotas, entregas e manutenções de
demonstração (idempotente por placa/CNH) e garantir o usuário administrador:

```bash
npm run seed --workspace @routeflow/api
```

Credenciais do administrador de demonstração:

| E-mail | Senha |
|---|---|
| `admin@routeflow.com` | `admin123` |

## Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastra um usuário e retorna um token |
| POST | `/api/auth/login` | Autentica e retorna um token |
| GET | `/api/auth/me` | Retorna o usuário autenticado (Bearer) |

## Veículos e motoristas

Todas as rotas exigem autenticação JWT (Bearer).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/vehicles` | Lista os veículos |
| GET | `/api/vehicles/:id` | Retorna um veículo |
| POST | `/api/vehicles` | Cria um veículo |
| PATCH | `/api/vehicles/:id` | Atualiza um veículo |
| DELETE | `/api/vehicles/:id` | Remove um veículo |
| GET | `/api/drivers` | Lista os motoristas |
| GET | `/api/drivers/:id` | Retorna um motorista |
| POST | `/api/drivers` | Cria um motorista |
| PATCH | `/api/drivers/:id` | Atualiza um motorista |
| DELETE | `/api/drivers/:id` | Remove um motorista |

O vínculo motorista—veículo é 1—1: informar `driver_id` ao criar/atualizar um
veículo (ou `vehicle_id` ao criar/atualizar um motorista) realoca o motorista,
liberando automaticamente qualquer veículo anterior.

## Rotas e entregas

Todas as rotas exigem autenticação JWT (Bearer).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/routes` | Lista as rotas |
| GET | `/api/routes/nearby` | Rotas dentro de um raio (`?lng=&lat=&radius_m=`) |
| GET | `/api/routes/:id/metrics` | Comprimento da rota em metros |
| GET | `/api/routes/:id` | Retorna uma rota |
| POST | `/api/routes` | Cria uma rota (GeoJSON LineString) |
| PATCH | `/api/routes/:id` | Atualiza uma rota |
| DELETE | `/api/routes/:id` | Remove uma rota |

A `geometry` é um GeoJSON `LineString` (SRID 4326) persistido como
`geometry(LineString, 4326)` com índice espacial GiST. A atribuição rota—veículo
é 1—1: cada veículo pode ter no máximo uma rota atribuída (`409` em conflito);
`PATCH` aceita `assigned_vehicle_id: null` para desatribuir.

Consultas geográficas usam PostGIS: `ST_DWithin` (raio em metros sobre geografia)
para proximidade e `ST_Length` para o comprimento da rota.

## Entregas

Todas as rotas exigem autenticação JWT (Bearer).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/deliveries` | Lista as entregas (filtro opcional `?route_id=`) |
| GET | `/api/deliveries/:id` | Retorna uma entrega |
| POST | `/api/deliveries` | Cria uma entrega |
| PATCH | `/api/deliveries/:id` | Atualiza uma entrega |
| DELETE | `/api/deliveries/:id` | Remove uma entrega |

A `geolocation` é um GeoJSON `Point` (SRID 4326) com índice GiST. A ordem da
entrega é única por rota (`409` em conflito). Ao definir o status como `done`, o
`delivered_at` é preenchido automaticamente.

## Manutenções

Todas as rotas exigem autenticação JWT (Bearer).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/maintenance` | Lista as manutenções (filtro opcional `?vehicle_id=`) |
| GET | `/api/maintenance/:id` | Retorna uma manutenção |
| POST | `/api/maintenance` | Cria uma manutenção |
| PATCH | `/api/maintenance/:id` | Atualiza uma manutenção |
| DELETE | `/api/maintenance/:id` | Remove uma manutenção |

O ciclo de vida é `scheduled` → `in_progress` → `done`. Ao entrar em andamento, o
`started_at` é preenchido e o veículo vai para `maintenance`; ao concluir, o
`finished_at` é preenchido e o veículo volta para `idle`. Uma manutenção concluída
não pode mudar de status (`400`).

## Tempo real (WebSocket)

O gateway expõe o namespace `/ws` (Socket.IO). A conexão exige um JWT válido,
enviado no handshake via `auth.token` ou no cabeçalho `Authorization: Bearer
<token>`. Conexões sem token válido são recusadas com o evento `unauthorized`.

```js
const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: { token: accessToken },
});

socket.on('vehicle_positions', ({ event, data }) => {
  // data: VehiclePositionMessage[]
});
```

O gateway assina o canal Redis `vehicles:positions`, agrega as posições por
janelas de ~100 ms (mantendo a última posição de cada veículo) e emite o evento
`vehicle_positions` com o envelope `{ event, data }`.

## Eventos e notificações (BullMQ)

O consumer de eventos cria um consumer group (`routeflow-api`) sobre a stream
Redis `vehicles:events` e, a cada ~500 ms, lê as entradas novas com
`XREADGROUP`. Cada evento é enfileirado na fila BullMQ `notifications` (job
`vehicle_event`) e confirmado com `XACK`. A entrega é ao-menos-uma-vez e o loop é
encerrado de forma graciosa no shutdown.

Os eventos de entrega e manutenção também são roteados para as filas
`deliveries` e `maintenance`, onde os workers atualizam o banco:

| Evento | Fila | Efeito |
|---|---|---|
| `delivery_started` | `deliveries` | Entrega em `in_progress` |
| `delivery_completed` | `deliveries` | Entrega `done` + `delivered_at` |
| `maintenance_started` | `maintenance` | Manutenção `in_progress` + veículo `maintenance` |
| `maintenance_completed` | `maintenance` | Manutenção `done` + veículo `idle` |

Todo evento consumido também é persistido em `event_log` (histórico).

A fila `notifications` é consumida por um worker que faz o push dos eventos aos
clientes WebSocket conectados no evento `vehicle_event` (envelope
`VehicleEventEnvelope`).

## Histórico de posições (PostGIS)

Um job recorrente (`position-snapshots`, a cada ~15 s) lê o estado atual de
todos os veículos do Redis (`vehicle:{id}:state` + `vehicles:geo`) e grava em
lote na tabela `vehicle_positions` (`geometry(Point, 4326)`, `speed_kmh`,
`status`, `recorded_at`) com índice GiST, permitindo consultas por região via
`ST_DWithin`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP (padrão `3000`) |
| `DATABASE_URL` | URL do PostgreSQL |
| `REDIS_URL` | URL do Redis |
| `JWT_SECRET` | Segredo de assinatura dos tokens (mín. 16 caracteres) |
