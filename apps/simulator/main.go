// Command simulator é o ponto de entrada do simulador de veículos do
// RouteFlow. Nesta etapa (bootstrap), ele valida a configuração, conecta ao
// Redis e expõe um health check HTTP; o movimento dos veículos será adicionado
// nas etapas seguintes.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"routeflow/simulator/internal/api"
	"routeflow/simulator/internal/config"
	"routeflow/simulator/internal/redisx"
	"routeflow/simulator/internal/server"
)

func main() {
	cfg := config.Load()

	redisClient, err := redisx.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("configuração do Redis inválida: %v", err)
	}
	defer redisClient.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := redisx.Ping(ctx, redisClient); err != nil {
		log.Fatalf("não foi possível conectar ao Redis: %v", err)
	}
	log.Printf("conectado ao Redis em %s", cfg.RedisURL)

	apiClient := api.New(cfg.APIURL)
	if err := apiClient.Health(ctx); err != nil {
		log.Printf("aviso: API em %s indisponível: %v", cfg.APIURL, err)
	} else {
		log.Printf("API disponível em %s", cfg.APIURL)
	}

	httpServer := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: server.NewHandler(),
	}

	go func() {
		log.Printf("health check em :%s/health", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("servidor HTTP encerrou com erro: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("encerrando simulador...")
	cancel()
	httpServer.Shutdown(context.Background())
}
