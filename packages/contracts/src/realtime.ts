export interface WebSocketEnvelope<T = unknown> {
  event: string;
  data: T;
}

export type VehiclePositionsEnvelope = WebSocketEnvelope<
  import('./events').VehiclePositionMessage[]
>;
export type VehicleEventEnvelope = WebSocketEnvelope<import('./events').VehicleEventMessage>;
