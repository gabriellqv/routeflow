// Package mover implementa o motor de movimento dos veículos: uma goroutine
// por veículo avança ao longo da rota, gerencia o estado (máquina de estados)
// e publica posições e eventos.
package mover

import (
	"context"
	"log"
	"sync"
	"time"

	"routeflow/simulator/internal/geometry"
	"routeflow/simulator/internal/model"
	"routeflow/simulator/internal/state"
)

// Publisher publica posições e eventos de veículo no barramento (Redis).
type Publisher interface {
	PublishPosition(ctx context.Context, msg model.PositionMessage) error
	PublishEvent(ctx context.Context, event state.Event) error
}

// Mover coordena a execução dos veículos simulados.
type Mover struct {
	publisher    Publisher
	speedKmh     float64
	tickInterval time.Duration
}

// New cria um Mover com a velocidade padrão e o intervalo de tick fornecidos.
func New(publisher Publisher, speedKmh float64, tickInterval time.Duration) *Mover {
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
	machine := state.NewMachine(state.StatusIdle)

	ticker := time.NewTicker(m.tickInterval)
	defer ticker.Stop()

	log.Printf("veículo %s (%s) iniciando rota %s (%.0f m)", vehicle.Plate, vehicle.ID, route.Name, total)

	m.emitEvent(ctx, vehicle.ID, state.EventRouteStarted, map[string]any{"route_id": route.ID})
	machine.Transition(state.StatusInRoute)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			distance += m.speedKmh * (m.tickInterval.Seconds() / 3600.0) * 1000.0

			completed := distance >= total
			status := machine.Status()
			if status == state.StatusIdle {
				// Rota concluída em tick anterior; nada mais a simular.
				continue
			}

			point := geometry.Interpolate(route.Geometry.Coordinates, distance)
			msg := model.PositionMessage{
				VehicleID: vehicle.ID,
				Lat:       point.Lat,
				Lng:       point.Lng,
				SpeedKmh:  m.speedKmh,
				Status:    string(status),
				RouteID:   route.ID,
				StopIndex: 0,
				Ts:        time.Now().UTC().Format(time.RFC3339),
			}

			if err := m.publisher.PublishPosition(ctx, msg); err != nil {
				log.Printf("falha ao publicar posição do veículo %s: %v", vehicle.ID, err)
			}

			m.emitEvent(ctx, vehicle.ID, state.EventVehicleMoving, map[string]any{"speed_kmh": m.speedKmh})

			if completed {
				m.emitEvent(ctx, vehicle.ID, state.EventRouteCompleted, map[string]any{"route_id": route.ID})
				machine.Transition(state.StatusIdle)
			}
		}
	}
}

// emitEvent publica um evento, registrando o erro sem interromper o loop.
func (m *Mover) emitEvent(ctx context.Context, vehicleID string, eventType state.EventType, payload map[string]any) {
	event := state.Event{
		VehicleID: vehicleID,
		Type:      eventType,
		Payload:   payload,
		Ts:        time.Now().UTC().Format(time.RFC3339),
	}
	if err := m.publisher.PublishEvent(ctx, event); err != nil {
		log.Printf("falha ao publicar evento %s do veículo %s: %v", eventType, vehicleID, err)
	}
}
