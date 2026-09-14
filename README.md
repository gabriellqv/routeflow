# RouteFlow

Sistema de logística/transporte com simulação em tempo real de veículos.

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Angular |
| API | NestJS |
| Simulador | Go |
| Banco | PostgreSQL + PostGIS |
| Estado/comunicação rápida | Redis |
| Filas assíncronas | BullMQ |
| Tempo real | WebSocket |
| Mapas | MapLibre |

## Estrutura

```
RouteFlow/
├── apps/
│   ├── api/          # NestJS
│   ├── web/          # Angular
│   └── simulator/    # Go
├── packages/         # contratos/tipos compartilhados
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 20+ (ver `.nvmrc`)
- Docker + Docker Compose

## Como rodar

```bash
# 1. Instalar dependências (também configura os hooks do Husky)
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir a infraestrutura (Postgres + PostGIS e Redis)
npm run docker:up

# 4. Compilar os contratos compartilhados
npm run build:contracts
```

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
| `npm run docker:up` | Sobe Postgres + Redis |
| `npm run docker:down` | Derruba a infraestrutura |
| `npm run docker:logs` | Acompanha os logs da infraestrutura |

## Qualidade de código

- **ESLint** + **Prettier** configurados na raiz.
- **Husky**:
  - `pre-commit` → roda `lint-staged` (ESLint + Prettier apenas nos arquivos alterados).
  - `pre-push` → roda `typecheck`.
- **CI** (`.github/workflows/ci.yml`): lint, verificação de formatação e build dos contratos.
