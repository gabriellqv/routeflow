// Package server fornece o servidor HTTP de health check e controle do
// simulador.
package server

import (
	"encoding/json"
	"net/http"

	"routeflow/simulator/internal/control"
)

// Request é o corpo aceito pelo endpoint de controle.
type Request struct {
	Action control.Action `json:"action"`
}

// Response é a resposta do endpoint de controle.
type Response struct {
	State control.State `json:"state"`
}

// NewHandler registra as rotas HTTP do simulador.
//
// O simulador expõe um health check simples (liveness/readiness) e o endpoint
// `/control`: `GET` retorna o estado atual da simulação e `POST` aplica uma ação
// (`start`, `pause` ou `stop`). O CORS é liberado para uso pelo web.
func NewHandler(controller *control.Controller) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("/control", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		switch r.Method {
		case http.MethodOptions:
			w.WriteHeader(http.StatusNoContent)
			return
		case http.MethodGet:
			writeState(w, controller.State())
			return
		case http.MethodPost:
			var request Request
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				http.Error(w, "corpo inválido", http.StatusBadRequest)
				return
			}

			ok, state := controller.Apply(request.Action)
			if !ok {
				http.Error(w, "ação inválida", http.StatusBadRequest)
				return
			}

			writeState(w, state)
			return
		default:
			w.Header().Set("Allow", "GET, POST, OPTIONS")
			http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		}
	})

	return mux
}

// writeState serializa o estado atual da simulação em JSON.
func writeState(w http.ResponseWriter, state control.State) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{State: state})
}
