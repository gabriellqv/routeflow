import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BullQueues,
  DeliveryStatus,
  MaintenanceStatus,
  RedisStreams,
  VehicleEventType,
  VehicleStatus,
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
  timeoutMs = 8000,
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
 * Testes de integração (e2e) dos workers de eventos.
 *
 * Publica eventos na stream `vehicles:events` e verifica que os workers de
 * entregas/manutenção atualizam o banco. Requer Postgres e Redis em execução.
 */
describe('Workers de eventos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redis: Redis;
  let notificationQueue: Queue;
  let deliveryQueue: Queue;
  let maintenanceQueue: Queue;
  let routeId: string;
  let deliveryId: string;
  let vehicleId: string;
  let maintenanceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
    redis = app.get<Redis>(REDIS_CLIENT);
    notificationQueue = app.get<Queue>(getQueueToken(BullQueues.notifications));
    deliveryQueue = app.get<Queue>(getQueueToken(BullQueues.deliveries));
    maintenanceQueue = app.get<Queue>(getQueueToken(BullQueues.maintenance));
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "maintenances", "deliveries", "routes", "vehicles", "drivers" RESTART IDENTITY CASCADE',
    );
    await redis.del(RedisStreams.vehiclesEvents);
    await Promise.all([
      notificationQueue.obliterate({ force: true }).catch(() => undefined),
      deliveryQueue.obliterate({ force: true }).catch(() => undefined),
      maintenanceQueue.obliterate({ force: true }).catch(() => undefined),
    ]);

    const [vehicle] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "vehicles" ("plate", "type", "model", "capacity_kg", "status")
       VALUES ('EVT001', 'truck', 'Volvo FH', 12000, $1) RETURNING "id"`,
      [VehicleStatus.InRoute],
    );
    vehicleId = vehicle.id;

    const [route] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "routes" ("name", "geometry", "waypoints", "assigned_vehicle_id", "status")
       VALUES ('Rota Eventos', ST_SetSRID(ST_GeomFromText('LINESTRING(-46.63 -23.55, -46.65 -23.6)'), 4326),
               '[]'::jsonb, $1, 'assigned') RETURNING "id"`,
      [vehicleId],
    );
    routeId = route.id;

    const [delivery] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "deliveries" ("route_id", "order", "geolocation", "address", "status")
       VALUES ($1, 1, ST_SetSRID(ST_MakePoint(-46.64, -23.58), 4326), 'Av. Paulista, 1000', $2)
       RETURNING "id"`,
      [routeId, DeliveryStatus.Pending],
    );
    deliveryId = delivery.id;

    const [maintenance] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "maintenances" ("vehicle_id", "type", "description", "status")
       VALUES ($1, 'preventive', 'Revisão', $2) RETURNING "id"`,
      [vehicleId, MaintenanceStatus.Scheduled],
    );
    maintenanceId = maintenance.id;
  });

  afterAll(async () => {
    await Promise.all([
      notificationQueue.obliterate({ force: true }).catch(() => undefined),
      deliveryQueue.obliterate({ force: true }).catch(() => undefined),
      maintenanceQueue.obliterate({ force: true }).catch(() => undefined),
    ]);
    await redis.del(RedisStreams.vehiclesEvents).catch(() => undefined);
    await app.close();
  });

  /**
   * Publica um evento na stream de eventos do simulador.
   *
   * @param event Evento a publicar.
   */
  async function publishEvent(event: VehicleEventMessage): Promise<void> {
    await redis.xadd(RedisStreams.vehiclesEvents, '*', 'data', JSON.stringify(event));
  }

  it('deve atualizar a entrega ao concluir (delivery_completed)', async () => {
    await publishEvent({
      vehicle_id: vehicleId,
      type: VehicleEventType.DeliveryCompleted,
      payload: { stop_id: deliveryId },
      ts: new Date().toISOString(),
    });

    await waitFor(async () => {
      const [row] = await dataSource.query<{ status: string; delivered_at: Date | null }[]>(
        'SELECT "status", "delivered_at" FROM "deliveries" WHERE "id" = $1',
        [deliveryId],
      );
      return row?.status === DeliveryStatus.Done && row?.delivered_at !== null;
    });

    const [job] = await deliveryQueue
      .getJobs(['waiting', 'active', 'completed'])
      .then((jobs) =>
        jobs.filter((candidate) => candidate.name === VehicleEventType.DeliveryCompleted),
      );
    expect(job).toBeDefined();
  });

  it('deve colocar o veículo em manutenção (maintenance_started)', async () => {
    await publishEvent({
      vehicle_id: vehicleId,
      type: VehicleEventType.MaintenanceStarted,
      payload: { maintenance_id: maintenanceId },
      ts: new Date().toISOString(),
    });

    await waitFor(async () => {
      const [row] = await dataSource.query<{ status: string }[]>(
        'SELECT "status" FROM "maintenances" WHERE "id" = $1',
        [maintenanceId],
      );
      return row?.status === MaintenanceStatus.InProgress;
    });

    const [vehicle] = await dataSource.query<{ status: string }[]>(
      'SELECT "status" FROM "vehicles" WHERE "id" = $1',
      [vehicleId],
    );
    expect(vehicle.status).toBe(VehicleStatus.Maintenance);
  });

  it('deve concluir a manutenção e liberar o veículo (maintenance_completed)', async () => {
    await dataSource.query(
      `UPDATE "maintenances" SET "status" = $1, "started_at" = now() WHERE "id" = $2`,
      [MaintenanceStatus.InProgress, maintenanceId],
    );
    await dataSource.query(`UPDATE "vehicles" SET "status" = $1 WHERE "id" = $2`, [
      VehicleStatus.Maintenance,
      vehicleId,
    ]);

    await publishEvent({
      vehicle_id: vehicleId,
      type: VehicleEventType.MaintenanceCompleted,
      payload: { maintenance_id: maintenanceId },
      ts: new Date().toISOString(),
    });

    await waitFor(async () => {
      const [row] = await dataSource.query<{ status: string }[]>(
        'SELECT "status" FROM "maintenances" WHERE "id" = $1',
        [maintenanceId],
      );
      return row?.status === MaintenanceStatus.Done;
    });

    const [vehicle] = await dataSource.query<{ status: string }[]>(
      'SELECT "status" FROM "vehicles" WHERE "id" = $1',
      [vehicleId],
    );
    expect(vehicle.status).toBe(VehicleStatus.Idle);
  });

  it('deve ignorar eventos com stop_id inexistente sem quebrar', async () => {
    await publishEvent({
      vehicle_id: vehicleId,
      type: VehicleEventType.DeliveryCompleted,
      payload: { stop_id: '00000000-0000-0000-0000-000000000000' },
      ts: new Date().toISOString(),
    });

    await waitFor(async () => {
      const jobs = await deliveryQueue.getJobs(['waiting', 'active', 'completed']);
      return jobs.some((job) => job.name === VehicleEventType.DeliveryCompleted);
    });

    const [row] = await dataSource.query<{ status: string }[]>(
      'SELECT "status" FROM "deliveries" WHERE "id" = $1',
      [deliveryId],
    );
    expect(row.status).toBe(DeliveryStatus.Pending);
  });
});
