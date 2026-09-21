import { Injectable } from '@angular/core';
import type { DriverDto, VehicleDto } from '@routeflow/contracts';
import { ResourceService } from '../../core/resource.service';

/** Dados aceitos na criação de um motorista. */
export interface CreateDriverInput {
  name: string;
  license_number: string;
  license_category: string;
  vehicle_id?: string;
}

/** Dados aceitos na atualização de um motorista. */
export interface UpdateDriverInput {
  name?: string;
  license_number?: string;
  license_category?: string;
  vehicle_id?: string;
}

/**
 * Serviço de motoristas.
 *
 * Lista, cria, atualiza e remove motoristas via `/api/drivers`, além de permitir
 * carregar os veículos disponíveis para associação.
 */
@Injectable({ providedIn: 'root' })
export class DriversService extends ResourceService<
  DriverDto,
  CreateDriverInput,
  UpdateDriverInput
> {
  protected readonly path = '/api/drivers';

  /**
   * Lista os veículos cadastrados (para associação no formulário).
   *
   * @returns Promise com os veículos.
   */
  listVehicles(): Promise<VehicleDto[]> {
    return this.api.getFirst<VehicleDto[]>('/api/vehicles');
  }
}
