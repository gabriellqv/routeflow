// Package state define os status e eventos de veículo e a máquina de estados
// que valida as transições do simulador, alinhados aos contratos do RouteFlow.
package state

// Status é o status operacional de um veículo.
type Status string

// Status possíveis, em conformidade com o enum VehicleStatus dos contratos.
const (
	StatusIdle        Status = "idle"
	StatusInRoute     Status = "in_route"
	StatusStopped     Status = "stopped"
	StatusFault       Status = "fault"
	StatusMaintenance Status = "maintenance"
)

// EventType é o tipo de evento de veículo.
type EventType string

// Eventos possíveis, em conformidade com o enum VehicleEventType dos contratos.
const (
	EventRouteStarted         EventType = "route_started"
	EventVehicleMoving        EventType = "vehicle_moving"
	EventVehicleStopped       EventType = "vehicle_stopped"
	EventArrivedStop          EventType = "arrived_stop"
	EventDeliveryStarted      EventType = "delivery_started"
	EventDeliveryCompleted    EventType = "delivery_completed"
	EventVehicleFault         EventType = "vehicle_fault"
	EventMaintenanceStarted   EventType = "maintenance_started"
	EventMaintenanceCompleted EventType = "maintenance_completed"
	EventRouteDeviation       EventType = "route_deviation"
	EventRouteCompleted       EventType = "route_completed"
)

// Event é uma mensagem de evento publicada na stream `vehicles:events`.
type Event struct {
	VehicleID string         `json:"vehicle_id"`
	Type      EventType      `json:"type"`
	Payload   map[string]any `json:"payload"`
	Ts        string         `json:"ts"`
}

// allowedTransitions mapeia um status atual aos status para os quais pode
// transicionar, refletindo a máquina de estados documentada.
var allowedTransitions = map[Status][]Status{
	StatusIdle:        {StatusInRoute},
	StatusInRoute:     {StatusStopped, StatusFault, StatusIdle},
	StatusStopped:     {StatusInRoute},
	StatusFault:       {StatusMaintenance},
	StatusMaintenance: {StatusIdle},
}

// Machine rastreia o status atual de um veículo e valida transições.
type Machine struct {
	status Status
}

// NewMachine cria uma máquina de estados no status inicial.
func NewMachine(initial Status) *Machine {
	return &Machine{status: initial}
}

// Status devolve o status atual.
func (m *Machine) Status() Status {
	return m.status
}

// Transition aplica a transição para `next`, retornando `true` quando válida.
//
// Transições inválidas são ignoradas (o status permanece inalterado).
func (m *Machine) Transition(next Status) bool {
	for _, allowed := range allowedTransitions[m.status] {
		if allowed == next {
			m.status = next
			return true
		}
	}
	return false
}
