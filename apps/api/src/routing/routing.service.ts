import {
  BadRequestException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { VehicleType } from '@routeflow/contracts';
import { ROUTING_OPTIONS, ROUTING_PROVIDER } from './routing.constants.js';
import type {
  RoutedPath,
  RouteRequest,
  RoutingProvider,
  RoutingProviderConfig,
} from './routing.types.js';

/**
 * Serviço de alto nível de roteamento.
 *
 * Mapeia o tipo do veículo para o perfil do motor, orquestra o cálculo da rota
 * e valida se todos os pontos estão dentro da tolerância de encaixe viário (snapping).
 */
@Injectable()
export class RoutingService {
  constructor(
    @Inject(ROUTING_PROVIDER)
    private readonly provider: RoutingProvider,
    @Inject(ROUTING_OPTIONS)
    private readonly config: RoutingProviderConfig,
  ) {}

  /**
   * Mapeia o tipo do veículo para o perfil de locomoção suportado pelo Valhalla.
   *
   * @param vehicleType Tipo de veículo (VehicleType).
   * @returns Perfil ('auto' | 'truck' | 'motorcycle').
   */
  resolveProfile(vehicleType?: VehicleType | string | null): RouteRequest['profile'] {
    switch (vehicleType) {
      case VehicleType.Truck:
      case 'truck':
        return 'truck';
      case VehicleType.Motorcycle:
      case 'motorcycle':
        return 'motorcycle';
      case VehicleType.Van:
      case 'van':
      case VehicleType.Car:
      case 'car':
      default:
        return 'auto';
    }
  }

  /**
   * Roteia uma lista de waypoints através da malha viária e valida a proximidade dos pontos.
   *
   * @param params Waypoints, tipo de veículo e opções de custo.
   * @returns Traçado encaixado e métricas de distância/duração.
   * @throws BadRequestException Se houver menos de 2 waypoints.
   * @throws UnprocessableEntityException Se algum waypoint estiver a mais de `snapToleranceM` da via mais próxima.
   */
  async route(params: {
    waypoints: { lng: number; lat: number }[];
    vehicleType?: VehicleType | string | null;
    costingOptions?: Record<string, unknown>;
  }): Promise<RoutedPath> {
    if (!params.waypoints || params.waypoints.length < 2) {
      throw new BadRequestException('A rota deve conter no mínimo 2 waypoints para cálculo');
    }

    const profile = this.resolveProfile(params.vehicleType);

    const path = await this.provider.route({
      waypoints: params.waypoints,
      profile,
      costingOptions: params.costingOptions,
    });

    // Valida a tolerância de encaixe viário (snapping) para cada waypoint informado
    const invalidSnaps = path.snapped
      .map((s, index) => ({
        index,
        distanceM: s.distanceM,
        waypoint: params.waypoints[index],
      }))
      .filter((s) => s.distanceM > this.config.snapToleranceM);

    if (invalidSnaps.length > 0) {
      const descriptions = invalidSnaps
        .map(
          (s) =>
            `ponto ${s.index + 1} (${s.waypoint.lng}, ${s.waypoint.lat}) a ${s.distanceM}m da via`,
        )
        .join('; ');

      throw new UnprocessableEntityException(
        `Waypoint(s) fora da malha viária ou a mais de ${this.config.snapToleranceM}m de uma via trafegável: ${descriptions}`,
      );
    }

    return path;
  }
}
