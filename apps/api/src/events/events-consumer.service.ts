import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { VehicleEventMessage } from '@routeflow/contracts';
import { BullQueues, RedisStreams, VehicleEventType } from '@routeflow/contracts';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { EventLogService } from '../positions/event-log.service.js';
import { REDIS_CLIENT } from '../redis/redis.constants.js';

/** Nome do consumer group da API sobre a stream de eventos. */
export const EVENTS_CONSUMER_GROUP = 'routeflow-api';

/** Nome do consumer individual dentro do grupo da API. */
export const EVENTS_CONSUMER_NAME = 'api-1';

/** Intervalo entre ciclos de leitura da stream (em milissegundos). */
const POLL_INTERVAL_MS = 500;

/** Quantidade máxima de entradas lidas por ciclo. */
const READ_BATCH_SIZE = 100;

/**
 * Mapeia tipos de evento para a fila BullMQ responsável por processá-los.
 */
const EVENT_QUEUE: Partial<Record<VehicleEventType, string>> = {
  [VehicleEventType.DeliveryStarted]: BullQueues.deliveries,
  [VehicleEventType.DeliveryCompleted]: BullQueues.deliveries,
  [VehicleEventType.MaintenanceStarted]: BullQueues.maintenance,
  [VehicleEventType.MaintenanceCompleted]: BullQueues.maintenance,
};

/**
 * Serviço que consome a stream `vehicles:events` e distribui os eventos.
 *
 * Cria (de forma idempotente) um consumer group sobre a stream e, em um loop
 * periódico, lê as entradas novas com `XREADGROUP`. Cada evento é roteado para
 * a fila BullMQ correspondente (entregas/manutenção) e também enfileirado na
 * fila `notifications`, sendo confirmado com `XACK`. O loop é encerrado de
 * forma graciosa no shutdown da aplicação.
 */
@Injectable()
export class EventsConsumerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(EventsConsumerService.name);

  /** Indica se o loop de consumo deve continuar executando. */
  private running = false;

  /** Timer que agenda o próximo ciclo de leitura. */
  private timer?: NodeJS.Timeout;

  /** Consumer group garantidamente criado. */
  private groupReady = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(BullQueues.notifications) private readonly notifications: Queue,
    @InjectQueue(BullQueues.deliveries) private readonly deliveries: Queue,
    @InjectQueue(BullQueues.maintenance) private readonly maintenance: Queue,
    private readonly eventLog: EventLogService,
  ) {}

  /**
   * Inicia o loop de consumo da stream de eventos.
   */
  onModuleInit(): void {
    this.running = true;
    void this.schedule();
  }

  /**
   * Interrompe o loop de consumo no shutdown.
   */
  onApplicationShutdown(): void {
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Agenda o próximo ciclo, mantendo o loop serializado (sem sobreposição).
   */
  private schedule(): void {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.poll().finally(() => this.schedule());
    }, POLL_INTERVAL_MS);

    this.timer.unref?.();
  }

  /**
   * Executa um ciclo de leitura e enfileiramento dos eventos.
   */
  private async poll(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const groupReady = await this.ensureGroup();

      if (!groupReady) {
        return;
      }

      const entries = await this.readNewEntries();

      for (const entry of entries) {
        await this.enqueue(entry.event);
        await this.redis.xack(RedisStreams.vehiclesEvents, EVENTS_CONSUMER_GROUP, entry.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';

      // A stream pode ter sido removida/reiniciada; recria o group no próximo
      // ciclo para não ficar preso em NOGROUP indefinidamente.
      if (message.includes('NOGROUP')) {
        this.groupReady = false;
      } else {
        this.logger.error(`Falha no ciclo de consumo de eventos: ${message}`);
      }
    }
  }

  /**
   * Garante a existência do consumer group, criando-o quando necessário.
   *
   * O group é criado a partir do início da stream (`0`) para não perder eventos
   * publicados antes da primeira leitura. A entrega é ao-menos-uma-vez, então
   * um evento já confirmado não é reentregue, mas eventos não confirmados
   * pendentes de uma execução anterior são reprocessados.
   *
   * @returns `true` quando o group está disponível.
   */
  private async ensureGroup(): Promise<boolean> {
    if (this.groupReady) {
      return true;
    }

    try {
      await this.redis.xgroup(
        'CREATE',
        RedisStreams.vehiclesEvents,
        EVENTS_CONSUMER_GROUP,
        '0',
        'MKSTREAM',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      // BUSYGROUP: o group já existe (criado por outra instância/ciclo).
      if (!message.includes('BUSYGROUP')) {
        throw error;
      }
    }

    this.groupReady = true;
    return true;
  }

  /**
   * Lê as entradas novas da stream para o consumer group.
   *
   * @returns Lista de eventos com seus respectivos identificadores.
   */
  private async readNewEntries(): Promise<{ id: string; event: VehicleEventMessage }[]> {
    const response = (await this.redis.xreadgroup(
      'GROUP',
      EVENTS_CONSUMER_GROUP,
      EVENTS_CONSUMER_NAME,
      'COUNT',
      READ_BATCH_SIZE,
      'STREAMS',
      RedisStreams.vehiclesEvents,
      '>',
    )) as [string, [string, string[]][]][] | null;

    if (!response) {
      return [];
    }

    const entries: { id: string; event: VehicleEventMessage }[] = [];

    for (const [, messages] of response) {
      for (const [id, fields] of messages) {
        const event = this.parseEvent(fields);

        if (event) {
          entries.push({ id, event });
        } else {
          // Entrada inválida é confirmada para não travar o consumer group.
          await this.redis.xack(RedisStreams.vehiclesEvents, EVENTS_CONSUMER_GROUP, id);
        }
      }
    }

    return entries;
  }

  /**
   * Converte os campos de uma entrada da stream em uma mensagem de evento.
   *
   * @param fields Campos no formato `[chave, valor, ...]`.
   * @returns A mensagem ou `null` quando o payload é inválido.
   */
  private parseEvent(fields: string[]): VehicleEventMessage | null {
    const dataIndex = fields.indexOf('data');

    if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
      return null;
    }

    try {
      const event = JSON.parse(fields[dataIndex + 1]) as VehicleEventMessage;
      return event?.vehicle_id && event?.type ? event : null;
    } catch {
      return null;
    }
  }

  /**
   * Enfileira o evento nas filas correspondentes.
   *
   * @param event Evento a ser enfileirado.
   */
  private async enqueue(event: VehicleEventMessage): Promise<void> {
    await this.eventLog.save(event);
    await this.notifications.add('vehicle_event', event);

    const targetQueue = EVENT_QUEUE[event.type];

    if (targetQueue === BullQueues.deliveries) {
      await this.deliveries.add(event.type, event);
    } else if (targetQueue === BullQueues.maintenance) {
      await this.maintenance.add(event.type, event);
    }
  }
}
