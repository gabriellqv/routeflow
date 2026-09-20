package geometry

import (
	"math"
	"testing"
)

func TestLength(t *testing.T) {
	coords := [][2]float64{{0, 0}, {0, 1}}

	length := Length(coords)

	// 1 grau de latitude ≈ 111 km.
	if math.Abs(length-111194) > 200 {
		t.Fatalf("comprimento inesperado: %f", length)
	}
}

func TestInterpolateSinglePoint(t *testing.T) {
	coords := [][2]float64{{-46.63, -23.55}}

	p := Interpolate(coords, 0)

	if p.Lng != -46.63 || p.Lat != -23.55 {
		t.Fatalf("ponto inesperado: %+v", p)
	}
}

func TestInterpolateClampsOutOfRange(t *testing.T) {
	coords := [][2]float64{{0, 0}, {0, 1}}

	start := Interpolate(coords, -10)
	end := Interpolate(coords, 1e9)

	if start.Lat != 0 {
		t.Fatalf("deveria limitar ao início: %+v", start)
	}
	if end.Lat != 1 {
		t.Fatalf("deveria limitar ao fim: %+v", end)
	}
}

func TestInterpolateMidpoint(t *testing.T) {
	coords := [][2]float64{{0, 0}, {0, 1}}

	total := Length(coords)
	mid := Interpolate(coords, total/2)

	if math.Abs(mid.Lat-0.5) > 1e-6 {
		t.Fatalf("ponto médio inesperado: %+v", mid)
	}
}
