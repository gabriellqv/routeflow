import { Injectable } from '@angular/core';
import type { DriverDto, VehicleDto, VehicleStatus, VehicleType } from '@routeflow/contracts';
import { ResourceService } from '../../core/resource.service';

/** Dados aceitos na criação de um veículo. */
export interface CreateVehicleInput {
  plate: string;
  type: VehicleType;
  model: string;
  capacity_kg: number;
  driver_id?: string;
}

/** Dados aceitos na atualização de um veículo. */
export interface UpdateVehicleInput {
  plate?: string;
  type?: VehicleType;
  model?: string;
  capacity_kg?: number;
  status?: VehicleStatus;
  driver_id?: string | null;
}

/**
 * Serviço de veículos.
 *
 * Lista, cria, atualiza e remove veículos via `/api/vehicles`, além de permitir
 * carregar os motoristas disponíveis para alocação.
 */
@Injectable({ providedIn: 'root' })
export class VehiclesService extends ResourceService<
  VehicleDto,
  CreateVehicleInput,
  UpdateVehicleInput
> {
  protected readonly path = '/api/vehicles';

  /**
   * Lista os motoristas cadastrados (para alocação no formulário).
   *
   * @returns Promise com os motoristas.
   */
  listDrivers(): Promise<DriverDto[]> {
    return this.api.getFirst<DriverDto[]>('/api/drivers');
  }
}
