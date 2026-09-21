// Command simulator é o ponto de entrada do simulador de veículos do
// RouteFlow. Ele valida a configuração, conecta ao Redis, autentica na API,
// carrega veículos/rotas e inicia o movimento, expondo um health check e um
// endpoint de controle (start/pause/stop) via HTTP.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"routeflow/simulator/internal/api"
	"routeflow/simulator/internal/config"
	"routeflow/simulator/internal/control"
	"routeflow/simulator/internal/emitter"
	"routeflow/simulator/internal/mover"
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

	controller := control.New(control.StateRunning)

	apiClient := api.New(cfg.APIURL, api.Credentials{Email: cfg.APIEmail, Password: cfg.APIPassword})
	if err := apiClient.Health(ctx); err != nil {
		log.Printf("aviso: API em %s indisponível: %v", cfg.APIURL, err)
	} else {
		log.Printf("API disponível em %s", cfg.APIURL)
	}

	httpServer := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: server.NewHandler(controller),
	}

	go func() {
		log.Printf("health check e controle em :%s", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("servidor HTTP encerrou com erro: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// Autentica e carrega veículos/rotas atribuídas da API, iniciando o movimento.
	go func() {
		if err := apiClient.Login(ctx); err != nil {
			log.Printf("falha ao autenticar na API: %v", err)
			return
		}

		vehicles, err := apiClient.LoadVehicles(ctx)
		if err != nil {
			log.Printf("falha ao carregar veículos: %v", err)
			return
		}
		routes, err := apiClient.LoadAssignedRoutes(ctx)
		if err != nil {
			log.Printf("falha ao carregar rotas: %v", err)
			return
		}

		log.Printf("simulando %d veículo(s) em %d rota(s)", len(vehicles), len(routes))

		m := mover.NewWithOptions(emitter.New(redisClient), mover.Options{
			SpeedKmh:     36,
			TickInterval: time.Second,
			Controller:   controller,
		})
		m.Run(ctx, routes, vehicles)
	}()

	<-stop

	log.Println("encerrando simulador...")
	cancel()
	httpServer.Shutdown(context.Background())
}
