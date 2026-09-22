import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BullQueues,
  RedisStreams,
  VehicleEventType,
  type VehicleEventMessage,
} from '@routeflow/contracts';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { REDIS_CLIENT } from '../src/redis/redis.constants.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Aguarda uma condição por polling, falhando com timeout.
 */
async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Timeout aguardando a condição esperada');
}

/**
 * Testes de integração (e2e) do consumer de eventos.
 *
 * Publica um evento na stream `vehicles:events` e verifica que ele é consumido
 * pelo grupo da API e transformado em um job da fila `notifications`. Requer
 * Redis em execução.
 */
describe('Eventos (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;
  let queue: Queue;
  let dataSource: DataSource;
  let vehicleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();

    redis = app.get<Redis>(REDIS_CLIENT);
    queue = app.get<Queue>(getQueueToken(BullQueues.notifications));
    dataSource = app.get(DataSource);

    // Remove resíduos de execuções anteriores.
    await redis.del(RedisStreams.vehiclesEvents);
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "event_log", "vehicles" RESTART IDENTITY CASCADE');

    const [vehicle] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "vehicles" ("plate", "type", "model", "capacity_kg", "status")
       VALUES ('EVTL01', 'truck', 'Volvo FH', 12000, 'in_route') RETURNING "id"`,
    );
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    await queue.obliterate({ force: true }).catch(() => undefined);
    await redis.del(RedisStreams.vehiclesEvents).catch(() => undefined);
    await app.close();
  });

  it('deve consumir a stream, registrar o evento e enfileirá-lo em notifications', async () => {
    const event: VehicleEventMessage = {
      vehicle_id: vehicleId,
      type: VehicleEventType.VehicleFault,
      payload: { code: 'E2E', description: 'Falha simulada' },
      ts: new Date().toISOString(),
    };

    await redis.xadd(RedisStreams.vehiclesEvents, '*', 'data', JSON.stringify(event));

    await waitFor(async () => {
      const jobs = await queue.getJobs(['waiting', 'active', 'completed']);
      return jobs.some((job) => job.name === 'vehicle_event');
    });

    const jobs = await queue.getJobs(['waiting', 'active', 'completed']);
    const job = jobs.find((candidate) => candidate.name === 'vehicle_event');

    expect(job?.data).toMatchObject(event);

    // O evento deve ter sido persistido no histórico.
    const [logged] = await dataSource.query<{ type: string }[]>(
      'SELECT "type" FROM "event_log" WHERE "vehicle_id" = $1',
      [vehicleId],
    );
    expect(logged.type).toBe(VehicleEventType.VehicleFault);

    // O evento deve ter sido confirmado no consumer group.
    const pending = (await redis.xpending(RedisStreams.vehiclesEvents, 'routeflow-api')) as [
      number,
      string | null,
      string | null,
      unknown[],
    ];
    expect(pending[0]).toBe(0);
  });
});
