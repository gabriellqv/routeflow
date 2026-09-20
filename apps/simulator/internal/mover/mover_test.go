package mover

import (
	"context"
	"sync"
	"testing"
	"time"

	"routeflow/simulator/internal/model"
)

// fakePublisher registra as posições publicadas para inspeção nos testes.
type fakePublisher struct {
	mu     sync.Mutex
	msgs   []model.PositionMessage
	lastID string
}

func (f *fakePublisher) PublishPosition(_ context.Context, msg model.PositionMessage) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.msgs = append(f.msgs, msg)
	return nil
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
	defer publisher.mu.Unlock()

	if len(publisher.msgs) == 0 {
		t.Fatal("esperava ao menos uma posição publicada")
	}
	for _, msg := range publisher.msgs {
		if msg.VehicleID != "vehicle-1" {
			t.Fatalf("vehicle_id inesperado: %s", msg.VehicleID)
		}
		if msg.RouteID != "route-1" {
			t.Fatalf("route_id inesperado: %s", msg.RouteID)
		}
		if msg.Status != "in_route" {
			t.Fatalf("status inesperado: %s", msg.Status)
		}
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
