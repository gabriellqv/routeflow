import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BullQueues, RedisStreams, VehicleEventType } from '@routeflow/contracts';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import {
  EVENTS_CONSUMER_GROUP,
  EVENTS_CONSUMER_NAME,
  EventsConsumerService,
} from './events-consumer.service.js';

/**
 * Testa o consumer da stream `vehicles:events` de forma isolada, sem Redis real.
 *
 * O `poll` é exercitado indiretamente: o `onModuleInit` agenda o primeiro ciclo
 * e, com timers falsos, avançamos no tempo para dispará-lo de forma síncrona.
 */
describe('EventsConsumerService', () => {
  let service: EventsConsumerService;
  let redis: {
    xgroup: ReturnType<typeof vi.fn>;
    xreadgroup: ReturnType<typeof vi.fn>;
    xack: ReturnType<typeof vi.fn>;
  };
  let queue: { add: ReturnType<typeof vi.fn> };
  let deliveriesQueue: { add: ReturnType<typeof vi.fn> };
  let maintenanceQueue: { add: ReturnType<typeof vi.fn> };

  const faultEvent = {
    vehicle_id: 'vehicle-1',
    type: VehicleEventType.VehicleFault,
    payload: { code: 'E1', description: 'Falha' },
    ts: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  };

  const deliveryEvent = {
    vehicle_id: 'vehicle-1',
    type: VehicleEventType.DeliveryCompleted,
    payload: { stop_id: 'stop-1' },
    ts: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  };

  const maintenanceEvent = {
    vehicle_id: 'vehicle-1',
    type: VehicleEventType.MaintenanceStarted,
    payload: { maintenance_id: 'maint-1' },
    ts: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  };

  /** Entrada da stream no formato retornado pelo ioredis. */
  const streamEntry = (id: string, payload: unknown): [string, [string, string[]][]] => [
    RedisStreams.vehiclesEvents,
    [[id, ['data', JSON.stringify(payload)]]],
  ];

  beforeEach(async () => {
    redis = {
      xgroup: vi.fn().mockResolvedValue('OK'),
      xreadgroup: vi.fn().mockResolvedValue(null),
      xack: vi.fn().mockResolvedValue(1),
    };
    queue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };
    deliveriesQueue = { add: vi.fn().mockResolvedValue({ id: 'job-2' }) };
    maintenanceQueue = { add: vi.fn().mockResolvedValue({ id: 'job-3' }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsConsumerService,
        { provide: REDIS_CLIENT, useValue: redis as unknown as Redis },
        { provide: getQueueToken(BullQueues.notifications), useValue: queue },
        { provide: getQueueToken(BullQueues.deliveries), useValue: deliveriesQueue },
        { provide: getQueueToken(BullQueues.maintenance), useValue: maintenanceQueue },
      ],
    }).compile();

    service = moduleRef.get(EventsConsumerService);
  });

  afterEach(() => {
    service.onApplicationShutdown();
    vi.useRealTimers();
  });

  /**
   * Dispara um ciclo de leitura e aguarda sua conclusão.
   */
  async function runOneCycle(): Promise<void> {
    vi.useFakeTimers();
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(500);
  }

  it('deve criar o consumer group de forma idempotente', async () => {
    redis.xreadgroup.mockResolvedValue(null);

    await runOneCycle();

    expect(redis.xgroup).toHaveBeenCalledWith(
      'CREATE',
      RedisStreams.vehiclesEvents,
      EVENTS_CONSUMER_GROUP,
      '0',
      'MKSTREAM',
    );
  });

  it('deve tolerar BUSYGROUP ao criar o group', async () => {
    redis.xgroup.mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists'));
    redis.xreadgroup.mockResolvedValue(null);

    await expect(runOneCycle()).resolves.toBeUndefined();
    expect(redis.xreadgroup).toHaveBeenCalled();
  });

  it('deve enfileirar cada evento e confirmar com XACK', async () => {
    redis.xreadgroup.mockResolvedValue([streamEntry('1-0', faultEvent)]);

    await runOneCycle();

    expect(queue.add).toHaveBeenCalledWith('vehicle_event', faultEvent);
    expect(redis.xack).toHaveBeenCalledWith(
      RedisStreams.vehiclesEvents,
      EVENTS_CONSUMER_GROUP,
      '1-0',
    );
  });

  it('deve rotear eventos de entrega para a fila deliveries', async () => {
    redis.xreadgroup.mockResolvedValue([streamEntry('2-0', deliveryEvent)]);

    await runOneCycle();

    expect(queue.add).toHaveBeenCalledWith('vehicle_event', deliveryEvent);
    expect(deliveriesQueue.add).toHaveBeenCalledWith(deliveryEvent.type, deliveryEvent);
    expect(maintenanceQueue.add).not.toHaveBeenCalled();
  });

  it('deve rotear eventos de manutenção para a fila maintenance', async () => {
    redis.xreadgroup.mockResolvedValue([streamEntry('3-0', maintenanceEvent)]);

    await runOneCycle();

    expect(maintenanceQueue.add).toHaveBeenCalledWith(maintenanceEvent.type, maintenanceEvent);
    expect(deliveriesQueue.add).not.toHaveBeenCalled();
  });

  it('deve ler novas entradas com o consumer group da API', async () => {
    redis.xreadgroup.mockResolvedValue(null);

    await runOneCycle();

    expect(redis.xreadgroup).toHaveBeenCalledWith(
      'GROUP',
      EVENTS_CONSUMER_GROUP,
      EVENTS_CONSUMER_NAME,
      'COUNT',
      100,
      'STREAMS',
      RedisStreams.vehiclesEvents,
      '>',
    );
  });

  it('deve confirmar entradas inválidas sem enfileirá-las', async () => {
    redis.xreadgroup.mockResolvedValue([
      [RedisStreams.vehiclesEvents, [['2-0', ['data', '{invalido']]]],
    ]);

    await runOneCycle();

    expect(queue.add).not.toHaveBeenCalled();
    expect(redis.xack).toHaveBeenCalledWith(
      RedisStreams.vehiclesEvents,
      EVENTS_CONSUMER_GROUP,
      '2-0',
    );
  });

  it('deve parar o loop após o shutdown', async () => {
    vi.useFakeTimers();
    service.onModuleInit();
    service.onApplicationShutdown();

    await vi.advanceTimersByTimeAsync(1500);

    expect(redis.xgroup).not.toHaveBeenCalled();
  });

  it('não deve quebrar quando a leitura falha', async () => {
    redis.xreadgroup.mockRejectedValue(new Error('redis indisponível'));

    await expect(runOneCycle()).resolves.toBeUndefined();
  });

  it('deve recriar o group quando a stream deixa de existir (NOGROUP)', async () => {
    redis.xgroup.mockResolvedValue('OK');
    redis.xreadgroup
      .mockRejectedValueOnce(new Error('NOGROUP No such key or consumer group'))
      .mockResolvedValue(null);

    vi.useFakeTimers();
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(500);

    // Cria uma vez na inicialização e recria após o NOGROUP.
    expect(redis.xgroup).toHaveBeenCalledTimes(2);
  });
});
