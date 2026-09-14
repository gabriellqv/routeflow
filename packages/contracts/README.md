# @routeflow/contracts

Contratos compartilhados entre API (NestJS), Simulador (Go) e Web (Angular).

Fonte da verdade: `docs/03-contratos-e-estado.md`.

## Conteúdo

- `enums.ts` — enums de domínio (status de veículo, rota, entrega, manutenção, tipos de evento).
- `redis.ts` — chaves, canais e streams do Redis, filas BullMQ e eventos WebSocket.
- `dtos.ts` — DTOs REST (Vehicle, Driver, Route, Delivery, Maintenance).
- `events.ts` — estado do veículo, mensagem de posição e eventos.
- `realtime.ts` — envelopes WebSocket.

## Uso

```ts
import { VehicleStatus, RedisKeys, WsEvents } from '@routeflow/contracts';
```

## Build

```bash
npm run build --workspace @routeflow/contracts
```
