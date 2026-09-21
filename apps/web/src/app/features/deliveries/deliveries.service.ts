import { Injectable } from '@angular/core';
import type { DeliveryDto, DeliveryStatus, GeoJsonPoint, RouteDto } from '@routeflow/contracts';
import { ResourceService } from '../../core/resource.service';

/** Dados aceitos na criação de uma entrega. */
export interface CreateDeliveryInput {
  route_id: string;
  order: number;
  geolocation: GeoJsonPoint;
  address: string;
  status?: DeliveryStatus;
}

/** Dados aceitos na atualização de uma entrega. */
export interface UpdateDeliveryInput {
  order?: number;
  geolocation?: GeoJsonPoint;
  address?: string;
  status?: DeliveryStatus;
}

/**
 * Serviço de entregas.
 *
 * Lista, cria, atualiza e remove entregas via `/api/deliveries`, além de expor
 * as rotas disponíveis para seleção.
 */
@Injectable({ providedIn: 'root' })
export class DeliveriesService extends ResourceService<
  DeliveryDto,
  CreateDeliveryInput,
  UpdateDeliveryInput
> {
  protected readonly path = '/api/deliveries';

  /**
   * Lista as rotas cadastradas (para seleção no formulário).
   *
   * @returns Promise com as rotas.
   */
  listRoutes(): Promise<RouteDto[]> {
    return this.api.getFirst<RouteDto[]>('/api/routes');
  }
}
