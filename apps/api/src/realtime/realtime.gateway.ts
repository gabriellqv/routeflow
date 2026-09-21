import { Inject, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import type { VehiclePositionMessage, VehiclePositionsEnvelope } from '@routeflow/contracts';
import { RedisChannels, WsEvents } from '@routeflow/contracts';
import type { Redis } from 'ioredis';
import type { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { REDIS_CLIENT } from '../redis/redis.constants.js';

/**
 * Intervalo de agregação (em milissegundos) das posições recebidas do Redis.
 *
 * As mensagens acumuladas nesse intervalo são enviadas aos clientes como um
 * único evento, reduzindo o volume de frames do WebSocket sob carga.
 */
const BATCH_INTERVAL_MS = 100;

/**
 * Gateway WebSocket responsável por repassar as posições dos veículos em tempo real.
 *
 * Assina o canal Redis `vehicles:positions` (via conexão dedicada de subscriber),
 * agrega as mensagens por uma janela curta e as emite para os clientes
 * autenticados no evento `vehicle_positions`. As conexões são autenticadas por
 * JWT (token no handshake ou cabeçalho `Authorization`).
 */
@WebSocketGateway({ path: '/ws', cors: { origin: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RealtimeGateway.name);

  /** Sockets autenticados, aptos a receber as posições. */
  private readonly clients = new Set<Socket>();

  /** Última posição conhecida de cada veículo na janela de agregação. */
  private readonly pending = new Map<string, VehiclePositionMessage>();

  /** Conexão dedicada ao pub/sub (o cliente principal não pode assinar). */
  private subscriber?: Redis;

  /** Timer da janela de agregação corrente. */
  private flushTimer?: NodeJS.Timeout;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly authService: AuthService,
  ) {}

  /**
   * Assina o canal de posições em uma conexão Redis dedicada.
   */
  async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.duplicate();

    this.subscriber.on('error', (error: Error) => {
      this.logger.error(`Erro na conexão de subscriber do Redis: ${error.message}`);
    });

    this.subscriber.on('message', (channel: string, payload: string) => {
      if (channel === RedisChannels.vehiclesPositions) {
        this.accumulate(payload);
      }
    });

    await this.subscriber.subscribe(RedisChannels.vehiclesPositions);
    this.logger.log(`Assinando o canal ${RedisChannels.vehiclesPositions} no Redis`);
  }

  /**
   * Autentica e registra o cliente que acabou de se conectar.
   *
   * @param client Socket recém-conectado.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new Error('Token de acesso não informado');
      }

      await this.authService.verify(token);
      this.clients.add(client);
    } catch {
      client.emit('unauthorized', { message: 'Token inválido ou expirado' });
      client.disconnect(true);
    }
  }

  /**
   * Remove o cliente do conjunto de assinantes.
   *
   * @param client Socket desconectado.
   */
  handleDisconnect(client: Socket): void {
    this.clients.delete(client);
  }

  /**
   * Libera o timer, cancela a assinatura e encerra a conexão de subscriber.
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.pending.clear();
    this.clients.clear();

    if (this.subscriber) {
      await this.subscriber.quit().catch(() => undefined);
      this.subscriber = undefined;
    }
  }

  /**
   * Armazena a última posição de cada veículo e agenda o envio agregado.
   *
   * @param payload Mensagem JSON publicada no canal de posições.
   */
  private accumulate(payload: string): void {
    let position: VehiclePositionMessage;

    try {
      position = JSON.parse(payload) as VehiclePositionMessage;
    } catch {
      this.logger.warn('Posição inválida recebida e descartada');
      return;
    }

    if (!position?.vehicle_id) {
      this.logger.warn('Posição sem vehicle_id recebida e descartada');
      return;
    }

    this.pending.set(position.vehicle_id, position);
    this.scheduleFlush();
  }

  /**
   * Agenda o envio agregado, caso ainda não exista uma janela em andamento.
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, BATCH_INTERVAL_MS);

    this.flushTimer.unref?.();
  }

  /**
   * Emite as posições acumuladas para os clientes autenticados.
   */
  private flush(): void {
    if (this.pending.size === 0) {
      return;
    }

    const envelope: VehiclePositionsEnvelope = {
      event: WsEvents.vehiclePositions,
      data: [...this.pending.values()],
    };

    this.pending.clear();

    for (const client of this.clients) {
      client.emit(WsEvents.vehiclePositions, envelope);
    }
  }

  /**
   * Extrai o token JWT do handshake, aceitando `auth.token` ou o cabeçalho
   * `Authorization` no formato `Bearer <token>`.
   *
   * @param client Socket conectado.
   * @returns O token encontrado ou `null`.
   */
  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const [scheme, token] = client.handshake.headers.authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
