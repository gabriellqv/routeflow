export const RedisKeys = {
  vehicleState: (vehicleId: string) => `vehicle:${vehicleId}:state`,
  vehiclesGeo: 'vehicles:geo',
} as const;

export const RedisChannels = {
  vehiclesPositions: 'vehicles:positions',
} as const;

export const RedisStreams = {
  vehiclesEvents: 'vehicles:events',
} as const;

export const BullQueues = {
  deliveries: 'deliveries',
  maintenance: 'maintenance',
  notifications: 'notifications',
  positionSnapshots: 'position-snapshots',
} as const;

export const WsEvents = {
  vehiclePositions: 'vehicle_positions',
  vehicleEvent: 'vehicle_event',
} as const;
