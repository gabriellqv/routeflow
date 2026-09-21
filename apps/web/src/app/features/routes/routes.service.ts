import { Injectable } from '@angular/core';
import type {
  GeoJsonLineString,
  RouteDto,
  RouteMetricsDto,
  RouteStatus,
  VehicleDto,
  WaypointDto,
} from '@routeflow/contracts';
import { ResourceService } from '../../core/resource.service';

/** Dados aceitos na criação de uma rota. */
export interface CreateRouteInput {
  name: string;
  geometry: GeoJsonLineString;
  waypoints?: WaypointDto[];
  assigned_vehicle_id?: string;
}

/** Dados aceitos na atualização de uma rota. */
export interface UpdateRouteInput {
  name?: string;
  geometry?: GeoJsonLineString;
  waypoints?: WaypointDto[];
  assigned_vehicle_id?: string | null;
  status?: RouteStatus;
}

/**
 * Serviço de rotas.
 *
 * Lista, cria, atualiza e remove rotas via `/api/routes`, além de expor
 * métricas e os veículos disponíveis para atribuição.
 */
@Injectable({ providedIn: 'root' })
export class RoutesService extends ResourceService<RouteDto, CreateRouteInput, UpdateRouteInput> {
  protected readonly path = '/api/routes';

  /**
   * Lista os veículos cadastrados (para atribuição no formulário).
   *
   * @returns Promise com os veículos.
   */
  listVehicles(): Promise<VehicleDto[]> {
    return this.api.getFirst<VehicleDto[]>('/api/vehicles');
  }

  /**
   * Consulta o comprimento da rota em metros.
   *
   * @param id Identificador da rota.
   * @returns Promise com as métricas da rota.
   */
  metrics(id: string): Promise<RouteMetricsDto> {
    return this.api.getFirst<RouteMetricsDto>(`${this.path}/${id}/metrics`);
  }
}
