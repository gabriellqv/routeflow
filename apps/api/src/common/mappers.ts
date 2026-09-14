import type { Driver } from '../drivers/driver.entity.js';
import { DriverResponseDto } from '../drivers/dto/driver-response.dto.js';
import type { Vehicle } from '../vehicles/vehicle.entity.js';
import { VehicleResponseDto } from '../vehicles/dto/vehicle-response.dto.js';

/**
 * Converte a entidade `Vehicle` para o DTO de resposta (`snake_case`).
 *
 * @param vehicle Entidade do veículo.
 * @returns DTO de resposta do veículo.
 */
export function toVehicleResponse(vehicle: Vehicle): VehicleResponseDto {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    type: vehicle.type,
    model: vehicle.model,
    capacity_kg: Number(vehicle.capacityKg),
    status: vehicle.status,
    driver_id: vehicle.driverId,
  };
}

/**
 * Converte a entidade `Driver` para o DTO de resposta (`snake_case`).
 *
 * @param driver Entidade do motorista.
 * @param vehicleId Identificador do veículo associado, quando houver.
 * @returns DTO de resposta do motorista.
 */
export function toDriverResponse(driver: Driver, vehicleId: string | null): DriverResponseDto {
  return {
    id: driver.id,
    name: driver.name,
    license_number: driver.licenseNumber,
    license_category: driver.licenseCategory,
    vehicle_id: vehicleId,
  };
}
