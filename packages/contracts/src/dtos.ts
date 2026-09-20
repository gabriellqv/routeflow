import {
  DeliveryStatus,
  MaintenanceStatus,
  MaintenanceType,
  RouteStatus,
  VehicleStatus,
  VehicleType,
} from './enums';

export interface VehicleDto {
  id: string;
  plate: string;
  type: VehicleType;
  model: string;
  capacity_kg: number;
  status: VehicleStatus;
  driver_id: string | null;
}

export interface DriverDto {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  vehicle_id: string | null;
}

export type GeoJsonLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export interface WaypointDto {
  lng: number;
  lat: number;
}

export interface RouteDto {
  id: string;
  name: string;
  geometry: GeoJsonLineString;
  waypoints: WaypointDto[];
  assigned_vehicle_id: string | null;
  status: RouteStatus;
}

export interface RouteMetricsDto {
  route_id: string;
  length_m: number;
}

export interface NearbyRouteDto extends RouteDto {
  distance_m: number;
}

export interface DeliveryDto {
  id: string;
  route_id: string;
  order: number;
  geolocation: GeoJsonPoint;
  address: string;
  status: DeliveryStatus;
  delivered_at: string | null;
}

export interface MaintenanceDto {
  id: string;
  vehicle_id: string;
  type: MaintenanceType;
  description: string;
  started_at: string | null;
  finished_at: string | null;
  status: MaintenanceStatus;
}
