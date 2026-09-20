// Package redisx fornece o cliente Redis compartilhado pelo simulador.
package redisx

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// New cria um cliente Redis a partir da URL fornecida (ex.: redis://host:6379).
func New(url string) (*redis.Client, error) {
	options, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	return redis.NewClient(options), nil
}

// Ping verifica a conexão com o Redis, retornando erro em caso de falha.
func Ping(ctx context.Context, client *redis.Client) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return client.Ping(ctx).Err()
}
