import type { Delivery } from '../deliveries/delivery.entity.js';
import { DeliveryResponseDto } from '../deliveries/dto/delivery-response.dto.js';
import type { Driver } from '../drivers/driver.entity.js';
import { DriverResponseDto } from '../drivers/dto/driver-response.dto.js';
import type { Route } from '../routes/route.entity.js';
import { RouteResponseDto } from '../routes/dto/route-response.dto.js';
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

/**
 * Converte a entidade `Route` para o DTO de resposta (`snake_case`).
 *
 * @param route Entidade da rota.
 * @returns DTO de resposta da rota.
 */
export function toRouteResponse(route: Route): RouteResponseDto {
  return {
    id: route.id,
    name: route.name,
    geometry: route.geometry,
    waypoints: route.waypoints,
    assigned_vehicle_id: route.assignedVehicleId,
    status: route.status,
  };
}

/**
 * Converte a entidade `Delivery` para o DTO de resposta (`snake_case`).
 *
 * @param delivery Entidade da entrega.
 * @returns DTO de resposta da entrega.
 */
export function toDeliveryResponse(delivery: Delivery): DeliveryResponseDto {
  return {
    id: delivery.id,
    route_id: delivery.routeId,
    order: delivery.order,
    geolocation: delivery.geolocation,
    address: delivery.address,
    status: delivery.status,
    delivered_at: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
  };
}
