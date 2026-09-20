// Package config carrega e centraliza a configuração do simulador a partir
// de variáveis de ambiente, com valores padrão para desenvolvimento.
package config

import "os"

// Config reúne os parâmetros de execução do simulador.
type Config struct {
	// RedisURL é a URL de conexão com o Redis (ex.: redis://localhost:6379).
	RedisURL string
	// APIURL é a URL base da API do RouteFlow (ex.: http://localhost:3000).
	APIURL string
	// Port é a porta HTTP do servidor de health check do simulador.
	Port string
}

// Load lê a configuração das variáveis de ambiente, aplicando valores padrão.
func Load() Config {
	return Config{
		RedisURL: getenv("REDIS_URL", "redis://localhost:6379"),
		APIURL:   getenv("API_URL", "http://localhost:3000"),
		Port:     getenv("SIMULATOR_PORT", "8080"),
	}
}

// getenv retorna o valor da variável de ambiente ou um padrão quando ausente
// ou vazio.
func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
