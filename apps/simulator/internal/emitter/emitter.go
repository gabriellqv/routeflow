// Package emitter publica o estado e as posições dos veículos no Redis.
package emitter

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"

	"routeflow/simulator/internal/model"
)

const (
	vehiclesGeo   = "vehicles:geo"
	positionsChan = "vehicles:positions"
)

// Emitter encapsula a escrita no Redis para o hot path do simulador.
type Emitter struct {
	client *redis.Client
}

// New cria um Emitter para o cliente Redis fornecido.
func New(client *redis.Client) *Emitter {
	return &Emitter{client: client}
}

// PublishPosition grava o estado do veículo (HASH + GEOADD) e publica a posição
// no canal de posições.
func (e *Emitter) PublishPosition(ctx context.Context, msg model.PositionMessage) error {
	state := model.State{
		Lat:       msg.Lat,
		Lng:       msg.Lng,
		SpeedKmh:  msg.SpeedKmh,
		Status:    msg.Status,
		RouteID:   msg.RouteID,
		StopIndex: msg.StopIndex,
		UpdatedAt: msg.Ts,
	}

	stateJSON, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("serializar estado: %w", err)
	}

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("serializar posição: %w", err)
	}

	stateKey := fmt.Sprintf("vehicle:%s:state", msg.VehicleID)

	pipe := e.client.TxPipeline()

	// O HASH mantém o estado atual; o JSON completo é armazenado no campo
	// `data` para simplificar a leitura pelo gateway (a Fase 4 pode evoluir
	// para campos individuais).
	pipe.HSet(ctx, stateKey, "data", stateJSON)
	pipe.GeoAdd(ctx, vehiclesGeo, &redis.GeoLocation{
		Name:      msg.VehicleID,
		Longitude: msg.Lng,
		Latitude:  msg.Lat,
	})
	pipe.Publish(ctx, positionsChan, msgJSON)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("publicar posição: %w", err)
	}

	return nil
}
