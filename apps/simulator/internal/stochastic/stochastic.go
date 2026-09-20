// Package stochastic gera eventos aleatórios configuráveis do simulador
// (falha e desvio), usando uma fonte de aleatoriedade injetável para permitir
// testes determinísticos.
package stochastic

import "math/rand"

// Config define as probabilidades dos eventos estocásticos por quilômetro.
type Config struct {
	// FaultPerKm é a probabilidade de falha por quilômetro percorrido.
	FaultPerKm float64
	// DeviationPerKm é a probabilidade de desvio por quilômetro percorrido.
	DeviationPerKm float64
}

// DefaultConfig devolve uma configuração conservadora para o MVP.
func DefaultConfig() Config {
	return Config{
		FaultPerKm:     0.0001,
		DeviationPerKm: 0.0001,
	}
}

// Generator decide a ocorrência de eventos estocásticos ao longo do trajeto.
type Generator struct {
	cfg    Config
	random *rand.Rand
}

// New cria um Generator com a configuração fornecida e uma fonte de
// aleatoriedade própria.
func New(cfg Config) *Generator {
	return &Generator{cfg: cfg, random: rand.New(rand.NewSource(rand.Int63()))}
}

// NewSeeded cria um Generator com fonte determinística (útil em testes).
func NewSeeded(cfg Config, seed int64) *Generator {
	return &Generator{cfg: cfg, random: rand.New(rand.NewSource(seed))}
}

// ShouldFault informa se uma falha deve ocorrer após percorrer `km` quilômetros.
func (g *Generator) ShouldFault(km float64) bool {
	return g.random.Float64() < g.cfg.FaultPerKm*km
}

// ShouldDeviate informa se um desvio deve ocorrer após percorrer `km`
// quilômetros.
func (g *Generator) ShouldDeviate(km float64) bool {
	return g.random.Float64() < g.cfg.DeviationPerKm*km
}
