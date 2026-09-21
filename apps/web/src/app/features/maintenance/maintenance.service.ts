import { Injectable } from '@angular/core';
import type {
  MaintenanceDto,
  MaintenanceStatus,
  MaintenanceType,
  VehicleDto,
} from '@routeflow/contracts';
import { ResourceService } from '../../core/resource.service';

/** Dados aceitos na criação de uma manutenção. */
export interface CreateMaintenanceInput {
  vehicle_id: string;
  type: MaintenanceType;
  description: string;
  status?: MaintenanceStatus;
}

/** Dados aceitos na atualização de uma manutenção. */
export interface UpdateMaintenanceInput {
  type?: MaintenanceType;
  description?: string;
  status?: MaintenanceStatus;
}

/**
 * Serviço de manutenções.
 *
 * Lista, cria, atualiza e remove manutenções via `/api/maintenance`, além de
 * expor os veículos disponíveis para seleção.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceService extends ResourceService<
  MaintenanceDto,
  CreateMaintenanceInput,
  UpdateMaintenanceInput
> {
  protected readonly path = '/api/maintenance';

  /**
   * Lista os veículos cadastrados (para seleção no formulário).
   *
   * @returns Promise com os veículos.
   */
  listVehicles(): Promise<VehicleDto[]> {
    return this.api.getFirst<VehicleDto[]>('/api/vehicles');
  }
}
