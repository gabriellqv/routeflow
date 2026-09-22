/** Raio médio da Terra em metros (WGS84). */
const EARTH_RADIUS_M = 6371000;

/**
 * Calcula a distância geodésica em metros entre dois pontos via fórmula de Haversine.
 *
 * @param coord1 Ponto de origem { lng, lat }.
 * @param coord2 Ponto de destino { lng, lat }.
 * @returns Distância em metros.
 */
export function haversineDistanceM(
  coord1: { lng: number; lat: number },
  coord2: { lng: number; lat: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Decodifica uma string de geometria codificada em Polyline6 (precisão de 6 casas decimais)
 * retornada pelo motor Valhalla.
 *
 * @param encoded String codificada em polyline6.
 * @returns Lista de coordenadas GeoJSON no formato `[longitude, latitude]`.
 */
export function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Converte para coordenadas em ponto flutuante GeoJSON [longitude, latitude]
    coordinates.push([lng / 1e6, lat / 1e6]);
  }

  return coordinates;
}
