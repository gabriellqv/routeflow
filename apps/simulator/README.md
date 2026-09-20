# @routeflow/simulator

Simulador de veículos do RouteFlow (Go). Move veículos ao longo das rotas,
publica posições/eventos no Redis e mantém o hot path desacoplado da API e do
banco.

## Requisitos

- Go (ver `go.mod`).
- Redis em execução (`npm run docker:up` na raiz) e, opcionalmente, a API.

## Execução

```bash
# a partir de apps/simulator
export REDIS_URL=redis://localhost:6379
export API_URL=http://localhost:3000
export SIMULATOR_PORT=8080
go run .
```

- Health check: `http://localhost:8080/health`

## Scripts

| Comando | Descrição |
|---|---|
| `go run .` | Executa o simulador |
| `go build ./...` | Compila |
| `go vet ./...` | Análise estática |
| `go test ./...` | Testes unitários |
| `gofmt -l .` | Verifica formatação |

## Estrutura

```
.
├── main.go            # Bootstrap: config, Redis, carregamento e movimento
└── internal/
    ├── config/        # Configuração a partir de variáveis de ambiente
    ├── redisx/        # Cliente Redis compartilhado
    ├── api/           # Cliente HTTP da API do RouteFlow (health + carregamento)
    ├── model/         # Tipos de domínio (veículo, rota, posição, estado)
    ├── geometry/      # Haversine, comprimento e interpolação de LineString
    ├── state/         # Status/eventos de veículo e máquina de estados
    ├── stochastic/    # Eventos aleatórios configuráveis (falha/desvio)
    ├── emitter/       # Publicação no Redis (HASH, GEOADD, PUBLISH, XADD)
    ├── mover/         # Motor: uma goroutine por veículo
    └── server/        # Servidor HTTP de health check
```

## Movimento

No boot, o simulador carrega os veículos e as rotas atribuídas da API e inicia
uma goroutine por veículo. Cada tick (1s) avança a distância percorrida
(`speed × dt`) e interpola a posição ao longo da `LineString` da rota,
publicando em `vehicles:positions` e gravando o estado (`vehicle:{id}:state`) e
o índice geo (`vehicles:geo`).

A velocidade padrão é 36 km/h.

## Máquina de estados

O status de cada veículo evolui conforme a máquina de estados:

```
idle ──(rota atribuída)──► in_route
in_route ──(chegou no stop)──► stopped
stopped ──(entrega)──► in_route
in_route ──(falha)──► fault
fault ──(manutenção)──► maintenance
maintenance ──(retornou)──► idle
in_route ──(último stop)──► idle   (rota concluída)
```

Nesta etapa, o simulador emite os eventos `route_started`, `vehicle_moving` e
`route_completed` na stream `vehicles:events` (`XADD`). Eventos estocásticos de
`vehicle_fault` e `route_deviation` são gerados por probabilidade configurável
por quilômetro (`internal/stochastic`).

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `REDIS_URL` | URL do Redis | `redis://localhost:6379` |
| `API_URL` | URL base da API | `http://localhost:3000` |
| `SIMULATOR_PORT` | Porta do health check | `8080` |
