package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"routeflow/simulator/internal/model"
)

// LoadVehicles busca os veículos da API.
func (c *Client) LoadVehicles(ctx context.Context) ([]model.Vehicle, error) {
	var vehicles []model.Vehicle
	if err := c.getJSON(ctx, "/api/vehicles", &vehicles); err != nil {
		return nil, fmt.Errorf("carregar veículos: %w", err)
	}
	return vehicles, nil
}

// LoadAssignedRoutes busca as rotas atribuídas a veículos da API.
func (c *Client) LoadAssignedRoutes(ctx context.Context) ([]model.Route, error) {
	var routes []model.Route
	if err := c.getJSON(ctx, "/api/routes", &routes); err != nil {
		return nil, fmt.Errorf("carregar rotas: %w", err)
	}

	assigned := make([]model.Route, 0, len(routes))
	for _, route := range routes {
		if route.AssignedVehicleID != "" {
			assigned = append(assigned, route)
		}
	}
	return assigned, nil
}

// getJSON executa um GET e decodifica a resposta JSON no destino.
func (c *Client) getJSON(ctx context.Context, path string, out any) error {
	url := fmt.Sprintf("%s%s", c.baseURL, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	c.authorize(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return err
	}

	return json.Unmarshal(body, out)
}
