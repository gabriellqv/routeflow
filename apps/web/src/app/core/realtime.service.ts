import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import type {
  VehicleEventMessage,
  VehiclePositionMessage,
  VehiclePositionsEnvelope,
} from '@routeflow/contracts';
import { WsEvents } from '@routeflow/contracts';
import { io, type Socket } from 'socket.io-client';
import { AuthStore } from './auth.store';
import { WS_URL } from './api-config';

/**
 * Estados de conexão do canal em tempo real.
 */
export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Serviço de tempo real (WebSocket).
 *
 * Conecta ao gateway `/ws` autenticando com o JWT da sessão, assina
 * `vehicle_positions` e `vehicle_event` e expõe o estado consolidado dos
 * veículos via signals. A reconexão é delegada ao `socket.io-client`
 * (reconexão automática com backoff).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly wsUrl = inject(WS_URL);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  private socket?: Socket;

  private readonly statusSignal = signal<RealtimeStatus>('disconnected');
  private readonly vehiclesSignal = signal<Map<string, VehiclePositionMessage>>(new Map());
  private readonly lastEventSignal = signal<VehicleEventMessage | null>(null);

  /** Estado atual da conexão. */
  readonly status = this.statusSignal.asReadonly();

  /** Última posição conhecida de cada veículo (por `vehicle_id`). */
  readonly vehicles = this.vehiclesSignal.asReadonly();

  /** Último evento de veículo recebido. */
  readonly lastEvent = this.lastEventSignal.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Abre a conexão WebSocket (idempotente).
   */
  connect(): void {
    if (this.socket) {
      return;
    }

    this.statusSignal.set('connecting');

    this.socket = io(this.wsUrl, {
      path: '/ws',
      auth: { token: this.authStore.token() },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => this.statusSignal.set('connected'));
    this.socket.on('disconnect', () => this.statusSignal.set('disconnected'));
    this.socket.on('connect_error', () => this.statusSignal.set('disconnected'));
    this.socket.on('unauthorized', () => this.statusSignal.set('disconnected'));

    this.socket.on(WsEvents.vehiclePositions, (envelope: VehiclePositionsEnvelope) => {
      this.applyPositions(envelope.data);
    });

    this.socket.on(WsEvents.vehicleEvent, (event: VehicleEventMessage) => {
      this.lastEventSignal.set(event);
    });
  }

  /** Encerra a conexão WebSocket. */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.statusSignal.set('disconnected');
  }

  /**
   * Remove um veículo do estado local (ex.: após remoção na tela de CRUD).
   *
   * @param vehicleId Identificador do veículo.
   */
  forget(vehicleId: string): void {
    this.vehiclesSignal.update((current) => {
      if (!current.has(vehicleId)) {
        return current;
      }

      const next = new Map(current);
      next.delete(vehicleId);
      return next;
    });
  }

  /**
   * Mescla as posições recebidas no estado local.
   *
   * @param positions Posições agregadas recebidas do gateway.
   */
  private applyPositions(positions: VehiclePositionMessage[]): void {
    if (positions.length === 0) {
      return;
    }

    this.vehiclesSignal.update((current) => {
      const next = new Map(current);

      for (const position of positions) {
        next.set(position.vehicle_id, position);
      }

      return next;
    });
  }
}
