/**
 * Perfil de locomoção viária suportado pelo motor de rotas.
 */
export type RoutingProfile = 'auto' | 'truck' | 'motorcycle';

/**
 * Parâmetros de solicitação de cálculo de rota.
 */
export interface RouteRequest {
  /** Lista ordenada de pontos (mínimo 2). */
  waypoints: { lng: number; lat: number }[];
  /** Perfil de locomoção suportado pelo motor. */
  profile: RoutingProfile;
  /** Opções adicionais de custeio/regras de tráfego. */
  costingOptions?: Record<string, unknown>;
}

/**
 * Traçado roteado e métricas associadas.
 */
export interface RoutedPath {
  /** Geometria LineString GeoJSON [longitude, latitude]. */
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  /** Comprimento total da rota em metros. */
  distanceM: number;
  /** Duração estimada em segundos. */
  durationS: number;
  /** Distância de cada waypoint de entrada até a via encaixada. */
  snapped: { distanceM: number }[];
}

/**
 * Interface do provedor de roteamento.
 */
export interface RoutingProvider {
  /**
   * Calcula o traçado e métricas entre waypoints.
   */
  route(request: RouteRequest): Promise<RoutedPath>;

  /**
   * Localiza a via mais próxima de um ponto e a distância até ela.
   */
  nearest(
    point: { lng: number; lat: number },
    profile: RoutingProfile,
  ): Promise<{ lng: number; lat: number; distanceM: number }>;
}

/**
 * Configuração do provedor de roteamento.
 */
export interface RoutingProviderConfig {
  baseUrl: string;
  timeoutMs: number;
  snapToleranceM: number;
}
