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