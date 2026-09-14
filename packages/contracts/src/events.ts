import { VehicleEventType } from './enums';

export interface VehicleState {
  lat: number;
  lng: number;
  speed_kmh: number;
  status: string;
  route_id: string;
  stop_index: number;
  updated_at: string;
}

export interface VehiclePositionMessage {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  status: string;
  route_id: string;
  stop_index: number;
  ts: string;
}

export interface VehicleEventPayloadMap {
  [VehicleEventType.RouteStarted]: { route_id: string };
  [VehicleEventType.VehicleMoving]: { speed_kmh: number };
  [VehicleEventType.VehicleStopped]: { reason: string };
  [VehicleEventType.ArrivedStop]: { stop_id: string };
  [VehicleEventType.DeliveryStarted]: { stop_id: string };
  [VehicleEventType.DeliveryCompleted]: { stop_id: string };
  [VehicleEventType.VehicleFault]: { code: string; description: string };
  [VehicleEventType.MaintenanceStarted]: { maintenance_id: string };
  [VehicleEventType.MaintenanceCompleted]: { maintenance_id: string };
  [VehicleEventType.RouteDeviation]: { distance_m: number; point: [number, number] };
  [VehicleEventType.RouteCompleted]: { route_id: string };
}

export type VehicleEventPayload = VehicleEventPayloadMap[VehicleEventType];

export interface VehicleEventMessage {
  vehicle_id: string;
  type: VehicleEventType;
  payload: Record<string, unknown>;
  ts: string;
}
