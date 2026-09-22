// Package mover implementa o motor de movimento dos veículos: uma goroutine
// por veículo avança ao longo da rota, gerencia o estado (máquina de estados)
// e publica posições e eventos, incluindo os eventos estocásticos.
package mover

import (
	"context"
	"log"
	"sync"
	"time"

	"routeflow/simulator/internal/control"
	"routeflow/simulator/internal/geometry"
	"routeflow/simulator/internal/model"
	"routeflow/simulator/internal/state"
	"routeflow/simulator/internal/stochastic"
)

// Publisher publica posições e eventos de veículo no barramento (Redis).
type Publisher interface {
	PublishPosition(ctx context.Context, msg model.PositionMessage) error
	PublishEvent(ctx context.Context, event state.Event) error
}

// Options reúne os parâmetros de execução do motor.
type Options struct {
	SpeedKmh     float64
	TickInterval time.Duration
	Stochastic   *stochastic.Generator
	// Controller, quando informado, permite pausar/parar a simulação.
	Controller *control.Controller
}

// Mover coordena a execução dos veículos simulados.
type Mover struct {
	publisher Publisher
	options   Options
}

// New cria um Mover com a velocidade padrão e o intervalo de tick fornecidos.
func New(publisher Publisher, speedKmh float64, tickInterval time.Duration) *Mover {
	return NewWithOptions(publisher, Options{
		SpeedKmh:     speedKmh,
		TickInterval: tickInterval,
		Stochastic:   stochastic.New(stochastic.DefaultConfig()),
	})
}

// NewWithOptions cria um Mover com opções completas.
//
// O gerador estocástico recebe o padrão quando não informado.
func NewWithOptions(publisher Publisher, options Options) *Mover {
	if options.Stochastic == nil {
		options.Stochastic = stochastic.New(stochastic.DefaultConfig())
	}

	return &Mover{publisher: publisher, options: options}
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

	ticker := time.NewTicker(m.options.TickInterval)
	defer ticker.Stop()

	log.Printf("veículo %s (%s) iniciando rota %s (%.0f m)", vehicle.Plate, vehicle.ID, route.Name, total)

	m.emitEvent(ctx, vehicle.ID, state.EventRouteStarted, map[string]any{"route_id": route.ID})
	machine.Transition(state.StatusInRoute)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if m.stopped() {
				log.Printf("veículo %s: simulação parada", vehicle.ID)
				return
			}

			if m.paused() {
				continue
			}

			status := machine.Status()
			if status == state.StatusIdle {
				// Rota concluída em tick anterior; nada mais a simular.
				continue
			}

			distance += m.options.SpeedKmh * (m.options.TickInterval.Seconds() / 3600.0) * 1000.0
			completed := distance >= total

			// Eventos estocásticos, avaliados a cada tick por quilômetro
			// percorrido desde o último tick.
			km := m.options.SpeedKmh * (m.options.TickInterval.Seconds() / 3600.0)

			if status == state.StatusInRoute && m.options.Stochastic.ShouldFault(km) {
				m.emitEvent(ctx, vehicle.ID, state.EventVehicleFault, map[string]any{
					"code":        "SIMULATED_FAULT",
					"description": "falha simulada",
				})
				machine.Transition(state.StatusFault)
				continue
			}

			if status == state.StatusInRoute && m.options.Stochastic.ShouldDeviate(km) {
				point := geometry.Interpolate(route.Geometry.Coordinates, distance)
				m.emitEvent(ctx, vehicle.ID, state.EventRouteDeviation, map[string]any{
					"distance_m": 0.0,
					"point":      []float64{point.Lng, point.Lat},
				})
			}

			point := geometry.Interpolate(route.Geometry.Coordinates, distance)
			msg := model.PositionMessage{
				VehicleID: vehicle.ID,
				Lat:       point.Lat,
				Lng:       point.Lng,
				SpeedKmh:  m.options.SpeedKmh,
				Status:    string(machine.Status()),
				RouteID:   route.ID,
				StopIndex: 0,
				Ts:        time.Now().UTC().Format(time.RFC3339),
			}

			if err := m.publisher.PublishPosition(ctx, msg); err != nil {
				log.Printf("falha ao publicar posição do veículo %s: %v", vehicle.ID, err)
			}

			if machine.Status() == state.StatusInRoute {
				m.emitEvent(ctx, vehicle.ID, state.EventVehicleMoving, map[string]any{"speed_kmh": m.options.SpeedKmh})
			}

			if completed {
				m.emitEvent(ctx, vehicle.ID, state.EventRouteCompleted, map[string]any{"route_id": route.ID})
				distance = 0.0
				machine.Transition(state.StatusInRoute)
			}
		}
	}
}

// paused indica se a simulação deve pausar o avanço dos veículos.
func (m *Mover) paused() bool {
	return m.state() == control.StatePaused
}

// stopped indica se a simulação foi encerrada pelo controle.
func (m *Mover) stopped() bool {
	return m.state() == control.StateStopped
}

// state devolve o estado atual do controlador (ou `running` sem controlador).
func (m *Mover) state() control.State {
	if m.options.Controller == nil {
		return control.StateRunning
	}

	return m.options.Controller.State()
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
