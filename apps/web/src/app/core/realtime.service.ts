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
 * (backoff exponencial); a cada tentativa o token atual da sessão é reenviado,
 * garantindo a re-assinatura após a reconexão. Uma conexão recusada por
 * autenticação (`unauthorized`) interrompe a reconexão para evitar laços.
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
  private readonly reconnectAttemptsSignal = signal(0);

  /** Estado atual da conexão. */
  readonly status = this.statusSignal.asReadonly();

  /** Última posição conhecida de cada veículo (por `vehicle_id`). */
  readonly vehicles = this.vehiclesSignal.asReadonly();

  /** Último evento de veículo recebido. */
  readonly lastEvent = this.lastEventSignal.asReadonly();

  /** Número de tentativas de reconexão desde a última conexão bem-sucedida. */
  readonly reconnectAttempts = this.reconnectAttemptsSignal.asReadonly();

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
    this.reconnectAttemptsSignal.set(0);

    this.socket = io(this.wsUrl, {
      path: '/ws',
      // O token é resolvido a cada tentativa (inclusive reconexões), garantindo
      // que a sessão mais recente seja usada ao reabrir a conexão.
      auth: (callback: (data: { token: string | null }) => void) =>
        callback({ token: this.authStore.token() }),
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      this.statusSignal.set('connected');
      this.reconnectAttemptsSignal.set(0);
    });

    this.socket.on('disconnect', () => this.statusSignal.set('disconnected'));

    this.socket.on('connect_error', () => this.statusSignal.set('connecting'));

    this.socket.io.on('reconnect_attempt', () =>
      this.reconnectAttemptsSignal.update((attempts) => attempts + 1),
    );

    this.socket.on('unauthorized', () => {
      // Sessão inválida: não adianta reconectar com o mesmo token.
      this.stopReconnection();
      this.statusSignal.set('disconnected');
      this.socket?.disconnect();
      this.socket = undefined;
    });

    this.socket.on(
      WsEvents.vehiclePositions,
      (envelope: VehiclePositionsEnvelope | VehiclePositionMessage[]) => {
        const positions = Array.isArray(envelope) ? envelope : envelope?.data;
        if (Array.isArray(positions)) {
          this.applyPositions(positions);
        }
      },
    );

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
   * Desabilita a reconexão automática do socket atual (ex.: token inválido).
   */
  private stopReconnection(): void {
    if (this.socket) {
      this.socket.io.opts.reconnection = false;
    }
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
