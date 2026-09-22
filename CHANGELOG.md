# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não publicado]

## [0.1.0] - 2026-09-22

Primeira versão do MVP: gestão logística com simulador em tempo real.

### Adicionado

- **Monorepo e tooling**: workspaces npm (`apps/*`, `packages/*`), ESLint,
  Prettier, Husky (commitlint, lint-staged, typecheck no pre-push), Dependabot,
  templates e CI (lint, formatação, builds, migrations e testes).
- **Contratos compartilhados** (`@routeflow/contracts`): enums, DTOs, mensagens
  de eventos, envelopes de WebSocket e chaves de Redis/BullMQ.
- **API (NestJS)**:
  - Autenticação JWT (cadastro, login e rota `me`) e migrations do TypeORM.
  - CRUD de veículos e motoristas (relação 1—1), rotas (PostGIS `LineString`),
    entregas (`Point`), manutenções (ciclo de vida) e consultas geográficas
    (`ST_DWithin`, `ST_Length`).
  - Gateway WebSocket (`/ws`) autenticado por JWT, assinando `vehicles:positions`
    com throttle/batch.
  - Consumer da stream `vehicles:events` (consumer group) → BullMQ
    (`notifications`, `deliveries`, `maintenance`) e persistência em `event_log`.
  - Workers de entregas e manutenção aplicando eventos no banco.
  - Push de eventos (`vehicle_event`) via WebSocket aos clientes conectados.
  - Job recorrente de snapshots Redis → PostGIS (`vehicle_positions`, GiST).
  - Seed completo de demonstração (veículos, motoristas, rotas, entregas,
    manutenções) e usuário administrador.
- **Simulador (Go)**:
  - Bootstrap com config, Redis, cliente HTTP autenticado e health check.
  - Movimento dos veículos ao longo das rotas (interpolação por tick) com
    publicação de estado/posição no Redis (`HSET`, `GEOADD`, `PUBLISH`).
  - Máquina de estados e emissão de eventos (`XADD`).
  - Eventos estocásticos configuráveis (falha e desvio) e endpoint de controle
    (`/control`: iniciar, pausar, parar).
- **Web (Angular)**:
  - Bootstrap standalone/zoneless com layout autenticado, login e guarda de rota.
  - Telas de CRUD para as cinco entidades de domínio.
  - Mapa em tempo real (MapLibre) com veículos coloridos por status e popups.
  - Tela de controle da simulação (iniciar/pausar/parar).
  - `RealtimeService` com reconexão e re-autenticação por token.

### Segurança

- Senhas armazenadas apenas como hash (bcrypt) e rotas de domínio protegidas por
  JWT.
