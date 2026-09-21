// Package api fornece o cliente HTTP usado pelo simulador para se comunicar
// com a API do RouteFlow (autenticação, carregamento de veículos e rotas).
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Credentials são as credenciais usadas para autenticar na API.
type Credentials struct {
	Email    string
	Password string
}

// tokenResponse é a resposta das rotas de autenticação da API.
type tokenResponse struct {
	AccessToken string `json:"accessToken"`
}

// Client encapsula o acesso HTTP à API do RouteFlow.
type Client struct {
	baseURL     string
	credentials Credentials
	httpClient  *http.Client

	mu    sync.Mutex
	token string
}

// New cria um cliente para a URL base da API fornecida.
func New(baseURL string, credentials Credentials) *Client {
	return &Client{
		baseURL:     baseURL,
		credentials: credentials,
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

// Login autentica na API e armazena o token de acesso para as próximas
// requisições.
func (c *Client) Login(ctx context.Context) error {
	payload, err := json.Marshal(map[string]string{
		"email":    c.credentials.Email,
		"password": c.credentials.Password,
	})
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/auth/login", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("login retornou status %d", resp.StatusCode)
	}

	var token tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return err
	}

	c.mu.Lock()
	c.token = token.AccessToken
	c.mu.Unlock()

	return nil
}

// authorize anexa o cabeçalho `Authorization` quando há token armazenado.
func (c *Client) authorize(req *http.Request) {
	c.mu.Lock()
	token := c.token
	c.mu.Unlock()

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
}
