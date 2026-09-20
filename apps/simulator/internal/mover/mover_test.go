package mover

import (
	"context"
	"sync"
	"testing"
	"time"

	"routeflow/simulator/internal/model"
	"routeflow/simulator/internal/state"
	"routeflow/simulator/internal/stochastic"
)

// fakePublisher registra posições e eventos publicados para inspeção.
type fakePublisher struct {
	mu     sync.Mutex
	msgs   []model.PositionMessage
	events []state.Event
	lastID string
}

func (f *fakePublisher) PublishPosition(_ context.Context, msg model.PositionMessage) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.msgs = append(f.msgs, msg)
	return nil
}

func (f *fakePublisher) PublishEvent(_ context.Context, event state.Event) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, event)
	return nil
}

func (f *fakePublisher) hasEvent(t state.EventType) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.events {
		if e.Type == t {
			return true
		}
	}
	return false
}

func TestRunPublishesPositions(t *testing.T) {
	route := model.Route{
		ID:                "route-1",
		Name:              "Teste",
		AssignedVehicleID: "vehicle-1",
		Geometry: model.Geometry{
			Type:        "LineString",
			Coordinates: [][2]float64{{0, 0}, {0, 0.001}},
		},
	}
	vehicle := model.Vehicle{ID: "vehicle-1", Plate: "ABC1234"}

	publisher := &fakePublisher{}
	mover := New(publisher, 36, 50*time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		mover.Run(ctx, []model.Route{route}, []model.Vehicle{vehicle})
		close(done)
	}()

	time.Sleep(120 * time.Millisecond)
	cancel()
	<-done

	publisher.mu.Lock()
	msgs := publisher.msgs
	publisher.mu.Unlock()

	if len(msgs) == 0 {
		t.Fatal("esperava ao menos uma posição publicada")
	}
	for _, msg := range msgs {
		if msg.VehicleID != "vehicle-1" {
			t.Fatalf("vehicle_id inesperado: %s", msg.VehicleID)
		}
		if msg.RouteID != "route-1" {
			t.Fatalf("route_id inesperado: %s", msg.RouteID)
		}
		if msg.Status != string(state.StatusInRoute) {
			t.Fatalf("status inesperado: %s", msg.Status)
		}
	}

	if !publisher.hasEvent(state.EventRouteStarted) {
		t.Fatal("esperava evento route_started")
	}
	if !publisher.hasEvent(state.EventVehicleMoving) {
		t.Fatal("esperava evento vehicle_moving")
	}
}

func TestRunEmitsRouteCompleted(t *testing.T) {
	route := model.Route{
		ID:                "route-1",
		Name:              "Curta",
		AssignedVehicleID: "vehicle-1",
		Geometry: model.Geometry{
			Type:        "LineString",
			Coordinates: [][2]float64{{0, 0}, {0, 0.0001}},
		},
	}
	vehicle := model.Vehicle{ID: "vehicle-1", Plate: "ABC1234"}

	publisher := &fakePublisher{}
	// Velocidade alta para percorrer a rota curta em poucos ticks.
	mover := New(publisher, 3600, 50*time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		mover.Run(ctx, []model.Route{route}, []model.Vehicle{vehicle})
		close(done)
	}()

	time.Sleep(300 * time.Millisecond)
	cancel()
	<-done

	if !publisher.hasEvent(state.EventRouteCompleted) {
		t.Fatal("esperava evento route_completed ao concluir a rota")
	}
}

func TestRunSkipsMissingVehicle(t *testing.T) {
	route := model.Route{
		ID:                "route-1",
		Name:              "Teste",
		AssignedVehicleID: "inexistente",
		Geometry: model.Geometry{
			Type:        "LineString",
			Coordinates: [][2]float64{{0, 0}, {0, 0.001}},
		},
	}

	publisher := &fakePublisher{}
	mover := New(publisher, 36, time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		mover.Run(ctx, []model.Route{route}, nil)
		close(done)
	}()

	time.Sleep(20 * time.Millisecond)
	cancel()
	<-done

	if len(publisher.msgs) != 0 {
		t.Fatalf("não deveria publicar para veículo inexistente: %d", len(publisher.msgs))
	}
}

func TestRunEmitsFaultOnStochasticEvent(t *testing.T) {
	route := model.Route{
		ID:                "route-1",
		Name:              "Teste",
		AssignedVehicleID: "vehicle-1",
		Geometry: model.Geometry{
			Type:        "LineString",
			Coordinates: [][2]float64{{0, 0}, {0, 0.1}},
		},
	}
	vehicle := model.Vehicle{ID: "vehicle-1", Plate: "ABC1234"}

	publisher := &fakePublisher{}
	gen := stochastic.NewSeeded(stochastic.Config{FaultPerKm: 1e6, DeviationPerKm: 0}, 1)
	mover := NewWithOptions(publisher, Options{
		SpeedKmh:     36,
		TickInterval: 50 * time.Millisecond,
		Stochastic:   gen,
	})

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		mover.Run(ctx, []model.Route{route}, []model.Vehicle{vehicle})
		close(done)
	}()

	time.Sleep(120 * time.Millisecond)
	cancel()
	<-done

	if !publisher.hasEvent(state.EventVehicleFault) {
		t.Fatal("esperava evento vehicle_fault com FaultPerKm = 1")
	}
}
