// Package model define os tipos de domínio usados pelo simulador, alinhados
// aos contratos compartilhados do RouteFlow (coordenadas em GeoJSON `[lng, lat]`).
package model

// Vehicle representa um veículo carregado da API.
type Vehicle struct {
	ID     string `json:"id"`
	Plate  string `json:"plate"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

// Route representa uma rota atribuída a um veículo.
type Route struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	AssignedVehicleID string   `json:"assigned_vehicle_id"`
	Geometry          Geometry `json:"geometry"`
}

// Geometry é uma LineString GeoJSON (coordenadas `[lng, lat]`).
type Geometry struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"`
}

// State é o estado atual de um veículo persistido no Redis (HASH).
type State struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	SpeedKmh  float64 `json:"speed_kmh"`
	Status    string  `json:"status"`
	RouteID   string  `json:"route_id"`
	StopIndex int     `json:"stop_index"`
	UpdatedAt string  `json:"updated_at"`
}

// PositionMessage é o payload publicado no canal de posições.
type PositionMessage struct {
	VehicleID string  `json:"vehicle_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	SpeedKmh  float64 `json:"speed_kmh"`
	Status    string  `json:"status"`
	RouteID   string  `json:"route_id"`
	StopIndex int     `json:"stop_index"`
	Ts        string  `json:"ts"`
}
