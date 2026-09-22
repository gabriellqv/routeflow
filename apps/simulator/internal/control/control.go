// Package control mantém o estado de execução da simulação (em execução,
// pausada ou parada) de forma segura para acesso concorrente pelos loops de
// veículo e pelo servidor HTTP de controle.
package control

import (
	"sync"
)

// Action é uma ação de controle da simulação.
type Action string

// Ações aceitas pelo endpoint de controle.
const (
	ActionStart Action = "start"
	ActionPause Action = "pause"
	ActionStop  Action = "stop"
)

// State é o estado atual de execução da simulação.
type State string

// Estados possíveis da simulação.
const (
	StateRunning State = "running"
	StatePaused  State = "paused"
	StateStopped State = "stopped"
)

// Controller mantém o estado de execução e valida as transições de controle.
type Controller struct {
	mu    sync.RWMutex
	state State
}

// New cria um Controller no estado inicial indicado.
func New(initial State) *Controller {
	return &Controller{state: initial}
}

// State devolve o estado atual.
func (c *Controller) State() State {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

// Apply aplica uma ação de controle, retornando `false` quando a ação é
// desconhecida.
func (c *Controller) Apply(action Action) (bool, State) {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch action {
	case ActionStart:
		c.state = StateRunning
	case ActionPause:
		c.state = StatePaused
	case ActionStop:
		c.state = StateStopped
	default:
		return false, c.state
	}

	return true, c.state
}
