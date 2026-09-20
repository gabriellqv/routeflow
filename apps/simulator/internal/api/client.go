// Package api fornece o cliente HTTP usado pelo simulador para se comunicar
// com a API do RouteFlow (carregamento de veículos e rotas).
package api

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

// Client encapsula o acesso HTTP à API do RouteFlow.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// New cria um cliente para a URL base da API fornecida.
func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Health consulta o endpoint /health da API e retorna erro se não estiver
// disponível.
func (c *Client) Health(ctx context.Context) error {
	url := fmt.Sprintf("%s/health", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check retornou status %d", resp.StatusCode)
	}

	return nil
}
