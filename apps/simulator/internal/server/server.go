// Package server fornece o servidor HTTP de health check do simulador.
package server

import (
	"net/http"
)

// NewHandler registra as rotas HTTP do simulador.
//
// O simulador mantém apenas um health check simples: a liveness é indicada
// pelo próprio processo, e a readiness é determinada pela conexão com o Redis
// no processo principal (fora deste handler).
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	return mux
}
