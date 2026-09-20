// Package mover implementa o motor de movimento dos veículos: uma goroutine
// por veículo avança ao longo da rota e publica a posição.
package mover

import (
	"context"
	"log"
	"sync"
	"time"

	"routeflow/simulator/internal/geometry"
	"routeflow/simulator/internal/model"
)

// PositionPublisher publica uma posição de veículo no barramento (Redis).
type PositionPublisher interface {
	PublishPosition(ctx context.Context, msg model.PositionMessage) error
}

// Mover coordena a execução dos veículos simulados.
type Mover struct {
	publisher    PositionPublisher
	speedKmh     float64
	tickInterval time.Duration
}

// New cria um Mover com a velocidade padrão e o intervalo de tick fornecidos.
func New(publisher PositionPublisher, speedKmh float64, tickInterval time.Duration) *Mover {
	return &Mover{
		publisher:    publisher,
		speedKmh:     speedKmh,
		tickInterval: tickInterval,
	}
}

// Run inicia uma goroutine por veículo com rota atribuída e aguarda até que o
// contexto seja cancelado. Retorna quando todas as goroutines terminam.
func (m *Mover) Run(ctx context.Context, routes []model.Route, vehicles []model.Vehicle) {
	byID := make(map[string]model.Vehicle, len(vehicles))
	for _, vehicle := range vehicles {
		byID[vehicle.ID] = vehicle
	}

	var wg sync.WaitGroup

	for _, route := range routes {
		vehicle, ok := byID[route.AssignedVehicleID]
		if !ok {
			log.Printf("rota %s referencia veículo inexistente %s", route.ID, route.AssignedVehicleID)
			continue
		}

		wg.Add(1)
		go func(route model.Route, vehicle model.Vehicle) {
			defer wg.Done()
			m.runVehicle(ctx, vehicle, route)
		}(route, vehicle)
	}

	wg.Wait()
}

// runVehicle executa o loop de tick de um único veículo até o cancelamento.
func (m *Mover) runVehicle(ctx context.Context, vehicle model.Vehicle, route model.Route) {
	total := geometry.Length(route.Geometry.Coordinates)
	distance := 0.0
	ticker := time.NewTicker(m.tickInterval)
	defer ticker.Stop()

	log.Printf("veículo %s (%s) iniciando rota %s (%.0f m)", vehicle.Plate, vehicle.ID, route.Name, total)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			distance += m.speedKmh * (m.tickInterval.Seconds() / 3600.0) * 1000.0

			point := geometry.Interpolate(route.Geometry.Coordinates, distance)
			msg := model.PositionMessage{
				VehicleID: vehicle.ID,
				Lat:       point.Lat,
				Lng:       point.Lng,
				SpeedKmh:  m.speedKmh,
				Status:    "in_route",
				RouteID:   route.ID,
				StopIndex: 0,
				Ts:        time.Now().UTC().Format(time.RFC3339),
			}

			if err := m.publisher.PublishPosition(ctx, msg); err != nil {
				log.Printf("falha ao publicar posição do veículo %s: %v", vehicle.ID, err)
			}
		}
	}
}
