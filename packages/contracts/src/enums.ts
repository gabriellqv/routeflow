export enum VehicleType {
  Truck = 'truck',
  Van = 'van',
  Car = 'car',
  Motorcycle = 'motorcycle',
}

export enum VehicleStatus {
  Idle = 'idle',
  InRoute = 'in_route',
  Stopped = 'stopped',
  Fault = 'fault',
  Maintenance = 'maintenance',
}

export enum RouteStatus {
  Created = 'created',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum DeliveryStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Done = 'done',
  Failed = 'failed',
}

export enum MaintenanceType {
  Preventive = 'preventive',
  Corrective = 'corrective',
}

export enum MaintenanceStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Done = 'done',
}

export enum VehicleEventType {
  RouteStarted = 'route_started',
  VehicleMoving = 'vehicle_moving',
  VehicleStopped = 'vehicle_stopped',
  ArrivedStop = 'arrived_stop',
  DeliveryStarted = 'delivery_started',
  DeliveryCompleted = 'delivery_completed',
  VehicleFault = 'vehicle_fault',
  MaintenanceStarted = 'maintenance_started',
  MaintenanceCompleted = 'maintenance_completed',
  RouteDeviation = 'route_deviation',
  RouteCompleted = 'route_completed',
}
