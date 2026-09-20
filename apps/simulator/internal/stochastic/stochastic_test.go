package stochastic

import "testing"

func TestShouldFaultAlwaysWhenProbabilityIsOne(t *testing.T) {
	g := NewSeeded(Config{FaultPerKm: 1}, 1)

	if !g.ShouldFault(1) {
		t.Fatal("deveria falhar quando a probabilidade é 1")
	}
}

func TestShouldFaultNeverWhenProbabilityIsZero(t *testing.T) {
	g := NewSeeded(Config{FaultPerKm: 0}, 1)

	for i := 0; i < 100; i++ {
		if g.ShouldFault(10) {
			t.Fatal("não deveria falhar quando a probabilidade é 0")
		}
	}
}

func TestShouldDeviateNeverWhenProbabilityIsZero(t *testing.T) {
	g := NewSeeded(Config{DeviationPerKm: 0}, 1)

	for i := 0; i < 100; i++ {
		if g.ShouldDeviate(10) {
			t.Fatal("não deveria desviar quando a probabilidade é 0")
		}
	}
}

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.FaultPerKm <= 0 || cfg.DeviationPerKm <= 0 {
		t.Fatalf("config padrão inválida: %+v", cfg)
	}
}
