import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { decodePolyline6, haversineDistanceM } from './polyline.util.js';
import { ROUTING_OPTIONS } from './routing.constants.js';
import type {
  RoutedPath,
  RouteRequest,
  RoutingProvider,
  RoutingProviderConfig,
} from './routing.types.js';

interface ValhallaLocation {
  lat: number;
  lon: number;
  side_of_street?: string;
  original_index?: number;
}

interface ValhallaLeg {
  shape: string;
  summary?: {
    length: number;
    time: number;
  };
}

interface ValhallaRouteResponse {
  trip: {
    summary: {
      length: number;
      time: number;
    };
    legs: ValhallaLeg[];
    locations: ValhallaLocation[];
    status?: number;
    status_message?: string;
  };
}

interface ValhallaLocateResult {
  input_lat: number;
  input_lon: number;
  edges?: Array<{
    correlated_lat: number;
    correlated_lon: number;
    distance?: number;
  }>;
}

/**
 * Provedor de roteamento via Valhalla self-hosted.
 *
 * Comunica-se com os endpoints `/route` e `/locate` do serviço Valhalla, decodifica
 * a geometria em polyline6 para GeoJSON e trata falhas de rede com fail-fast (503).
 */
@Injectable()
export class ValhallaProvider implements RoutingProvider {
  private readonly logger = new Logger(ValhallaProvider.name);

  constructor(
    @Inject(ROUTING_OPTIONS)
    private readonly config: RoutingProviderConfig,
  ) {}

  /**
   * Calcula a rota encaixada na malha viária utilizando o endpoint `/route`.
   *
   * @param request Parâmetros de rota (waypoints, perfil e opções).
   * @returns Traçado e métricas reais.
   * @throws ServiceUnavailableException Quando o serviço Valhalla está indisponível ou responde com erro.
   */
  async route(request: RouteRequest): Promise<RoutedPath> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/route`;

    const body = {
      locations: request.waypoints.map((wp) => ({ lon: wp.lng, lat: wp.lat })),
      costing: request.profile,
      costing_options: request.costingOptions,
      directions_options: { units: 'kilometers' },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`Valhalla /route respondeu com status ${response.status}: ${errorText}`);
        throw new ServiceUnavailableException('Motor de rotas indisponível');
      }

      const data = (await response.json()) as ValhallaRouteResponse;
      const trip = data.trip;

      if (!trip || !Array.isArray(trip.legs) || trip.legs.length === 0) {
        throw new ServiceUnavailableException('Motor de rotas retornou resposta inválida');
      }

      // Decodifica e concatena as geometrias de todas as pernas da rota
      const coordinates: [number, number][] = [];
      for (const leg of trip.legs) {
        const legCoords = decodePolyline6(leg.shape);
        if (coordinates.length === 0) {
          coordinates.push(...legCoords);
        } else {
          // Evita duplicar o ponto de conexão entre pernas consecutivas
          const startIndex =
            coordinates[coordinates.length - 1][0] === legCoords[0]?.[0] &&
            coordinates[coordinates.length - 1][1] === legCoords[0]?.[1]
              ? 1
              : 0;
          coordinates.push(...legCoords.slice(startIndex));
        }
      }

      // Calcula a distância de snapping de cada waypoint de entrada até a via correspondente
      const snapped = request.waypoints.map((wp, idx) => {
        const matched = trip.locations?.[idx];
        if (matched && typeof matched.lat === 'number' && typeof matched.lon === 'number') {
          return {
            distanceM: Math.round(haversineDistanceM(wp, { lng: matched.lon, lat: matched.lat })),
          };
        }
        return { distanceM: 0 };
      });

      const distanceM = Math.round(trip.summary.length * 1000);
      const durationS = Math.round(trip.summary.time);

      return {
        geometry: {
          type: 'LineString',
          coordinates,
        },
        distanceM,
        durationS,
        snapped,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `Falha ao conectar ao Valhalla em ${url}: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException('Motor de rotas indisponível');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Localiza a via mais próxima de um ponto geográfico utilizando o endpoint `/locate`.
   *
   * @param point Coordenadas do ponto.
   * @param profile Perfil de locomoção.
   * @returns Ponto mais próximo na malha viária e distância em metros.
   * @throws ServiceUnavailableException Quando o serviço Valhalla está indisponível.
   */
  async nearest(
    point: { lng: number; lat: number },
    profile: RouteRequest['profile'],
  ): Promise<{ lng: number; lat: number; distanceM: number }> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/locate`;

    const body = {
      locations: [{ lon: point.lng, lat: point.lat }],
      costing: profile,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ServiceUnavailableException('Motor de rotas indisponível');
      }

      const results = (await response.json()) as ValhallaLocateResult[];
      const firstEdge = results[0]?.edges?.[0];

      if (!firstEdge) {
        return { lng: point.lng, lat: point.lat, distanceM: Number.POSITIVE_INFINITY };
      }

      const distanceM = Math.round(
        haversineDistanceM(point, {
          lng: firstEdge.correlated_lon,
          lat: firstEdge.correlated_lat,
        }),
      );

      return {
        lng: firstEdge.correlated_lon,
        lat: firstEdge.correlated_lat,
        distanceM,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `Falha ao consultar /locate no Valhalla: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException('Motor de rotas indisponível');
    } finally {
      clearTimeout(timer);
    }
  }
}
