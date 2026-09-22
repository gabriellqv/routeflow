# 08 — Release v0.1.0 (MVP)

Documento de execução e release da primeira versão do RouteFlow (MVP),
consolidando as Fases 0–7 do plano de implementação.

## Escopo entregue

| Fase | Entrega |
|---|---|
| 0 | Monorepo, tooling (ESLint/Prettier/Husky/commitlint), CI, Dependabot |
| 1 | API NestJS: auth JWT, migrations, CRUD de veículos/motoristas/rotas/entregas/manutenções |
| 2 | PostGIS: geometria, `ST_DWithin`, `ST_Length` e seed |
| 3 | Simulador Go: movimento, máquina de estados, eventos estocásticos |
| 4 | Tempo real: gateway WebSocket e consumer da stream → BullMQ |
| 5 | Web Angular: autenticação, CRUD, mapa MapLibre e controle da simulação |
| 6 | Workers (entregas/manutenção), snapshots Redis → PostGIS e push de eventos via WS |
| 7 | Reconexão do WS, seed completo, documentação e release |

## Execução local

Pré-requisitos: Node.js 24, Go 1.22+, Docker.

```bash
npm install
cp .env.example .env
npm run docker:up
npm run build:contracts
npm run migration:run --workspace @routeflow/api
npm run seed --workspace @routeflow/api
```

Terminais separados:

```bash
npm run start:dev --workspace @routeflow/api   # http://localhost:3000
npm run start --workspace @routeflow/web       # http://localhost:4200
cd apps/simulator && go run .                  # http://localhost:8080
```

Credenciais de demonstração: `admin@routeflow.com` / `admin123`.

## Roteiro de verificação (smoke test)

1. **Login** em `http://localhost:4200` com as credenciais acima.
2. **CRUD**: criar/editar/remover em Veículos, Motoristas, Rotas, Entregas e
   Manutenções.
3. **Simulação**: em `/simulation`, confirmar o estado `running`; usar Pausar/
   Iniciar e observar a mudança de estado.
4. **Mapa**: em `/map`, ver os veículos se movendo ao longo das rotas, coloridos
   pelo status, com popup ao clicar.
5. **Eventos**: iniciar uma rota concluída/falha no simulador e observar o push
   de `vehicle_event` (histórico em `event_log`).
6. **Histórico**: verificar `vehicle_positions` sendo populado
   (`SELECT count(*) FROM vehicle_positions;`).

## Controle do simulador

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| GET | `http://localhost:8080/control` | — | Estado atual |
| POST | `http://localhost:8080/control` | `{"action":"start\|pause\|stop"}` | Aplica a ação |

## Variáveis de ambiente

| Variável | Serviço | Descrição |
|---|---|---|
| `DATABASE_URL` | API | URL do PostgreSQL |
| `REDIS_URL` | API/Simulador | URL do Redis |
| `JWT_SECRET` | API | Segredo dos tokens |
| `PORT` | API | Porta HTTP (padrão `3000`) |
| `API_URL` | Simulador | URL base da API |
| `API_EMAIL` / `API_PASSWORD` | Simulador | Credenciais de autenticação |
| `SIMULATOR_PORT` | Simulador | Porta do health/controle (padrão `8080`) |
| `WEB_API_URL` | Web | URL da API exposta ao navegador |
| `WEB_SIMULATOR_URL` | Web | URL do simulador exposta ao navegador |

## Qualidade

- API: testes unitários (com cobertura mínima no Vitest) e de integração.
- Web: testes unitários (Vitest).
- Simulador: `go test`, `go vet` e `gofmt`.
- CI cobre lint, formatação, builds, migrations e todos os testes.

## Pendências conhecidas (pós-MVP)

- `main`/`develop`: manter sincronizados via PR `develop → main` a cada fase.
- Branch protection (`develop`/`main`): configuração manual no GitHub.
- Push de eventos é broadcast (sem filtro por veículo/viewport).
- `event_log` exige veículo existente (FK); eventos de veículos desconhecidos
  falham no worker.
- Autenticação por papéis (RBAC) e integrações externas (ERP/TMS) fora do MVP.
