// Package geometry fornece operações geográficas para interpolar a posição de
// um veículo ao longo do traçado (LineString) de uma rota.
package geometry

import "math"

const earthRadiusM = 6371000.0

// Point é uma posição geográfica em graus.
type Point struct {
	Lat float64
	Lng float64
}

// Haversine calcula a distância, em metros, entre dois pontos na superfície
// terrestre.
func Haversine(a, b Point) float64 {
	lat1 := toRad(a.Lat)
	lat2 := toRad(b.Lat)
	dLat := toRad(b.Lat - a.Lat)
	dLng := toRad(b.Lng - a.Lng)

	sinLat := math.Sin(dLat / 2)
	sinLng := math.Sin(dLng / 2)

	hav := sinLat*sinLat + math.Cos(lat1)*math.Cos(lat2)*sinLng*sinLng
	c := 2 * math.Atan2(math.Sqrt(hav), math.Sqrt(1-hav))

	return earthRadiusM * c
}

// Length calcula o comprimento total, em metros, de uma LineString.
func Length(coords [][2]float64) float64 {
	total := 0.0
	for i := 1; i < len(coords); i++ {
		total += Haversine(toPoint(coords[i-1]), toPoint(coords[i]))
	}
	return total
}

// Interpolate devolve o ponto situado a `distance` metros do início da
// LineString, percorrendo os segmentos até atingir a distância pedida.
//
// Distâncias negativas ou maiores que o comprimento total são limitadas ao
// primeiro/último ponto, respectivamente.
func Interpolate(coords [][2]float64, distance float64) Point {
	if len(coords) == 0 {
		return Point{}
	}
	if len(coords) == 1 {
		return toPoint(coords[0])
	}

	remaining := math.Max(0, distance)
	for i := 1; i < len(coords); i++ {
		a := toPoint(coords[i-1])
		b := toPoint(coords[i])
		segment := Haversine(a, b)

		if remaining <= segment {
			if segment == 0 {
				return b
			}
			t := remaining / segment
			return Point{
				Lat: a.Lat + (b.Lat-a.Lat)*t,
				Lng: a.Lng + (b.Lng-a.Lng)*t,
			}
		}

		remaining -= segment
	}

	return toPoint(coords[len(coords)-1])
}

// toPoint converte `[lng, lat]` para um Point.
func toPoint(coord [2]float64) Point {
	return Point{Lat: coord[1], Lng: coord[0]}
}

// toRad converte graus para radianos.
func toRad(deg float64) float64 {
	return deg * math.Pi / 180
}
