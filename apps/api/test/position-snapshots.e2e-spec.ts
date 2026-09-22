import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisKeys, VehicleStatus } from '@routeflow/contracts';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { REDIS_CLIENT } from '../src/redis/redis.constants.js';
import { VehiclePositionsService } from '../src/positions/vehicle-positions.service.js';
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
 * Testes de integração (e2e) do histórico de posições.
 *
 * Popula o estado quente no Redis e verifica que o worker/serviço persiste os
 * snapshots em `vehicle_positions` (PostGIS). Requer Postgres e Redis.
 */
describe('Snapshots de posição (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redis: Redis;
  let service: VehiclePositionsService;
  let vehicleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
    redis = app.get<Redis>(REDIS_CLIENT);
    service = app.get(VehiclePositionsService);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "vehicle_positions", "vehicles" RESTART IDENTITY CASCADE',
    );
    await redis.del(RedisKeys.vehiclesGeo);

    const [vehicle] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "vehicles" ("plate", "type", "model", "capacity_kg", "status")
       VALUES ('SNAP01', 'truck', 'Volvo FH', 12000, $1) RETURNING "id"`,
      [VehicleStatus.InRoute],
    );
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    await redis.del(RedisKeys.vehiclesGeo).catch(() => undefined);
    await app.close();
  });

  it('deve persistir o snapshot com posição PostGIS e status', async () => {
    await redis.geoadd(RedisKeys.vehiclesGeo, -46.63, -23.55, vehicleId);
    await redis.hset(
      RedisKeys.vehicleState(vehicleId),
      'data',
      JSON.stringify({
        lat: -23.55,
        lng: -46.63,
        speed_kmh: 42,
        status: VehicleStatus.InRoute,
        route_id: 'route-1',
        stop_index: 0,
        updated_at: new Date().toISOString(),
      }),
    );

    await service.saveMany([
      { vehicleId, lng: -46.63, lat: -23.55, speedKmh: 42, status: VehicleStatus.InRoute },
    ]);

    await waitFor(async () => {
      const [row] = await dataSource.query<{ total: string }[]>(
        'SELECT count(*)::text AS total FROM "vehicle_positions" WHERE "vehicle_id" = $1',
        [vehicleId],
      );
      return row?.total === '1';
    });

    const [row] = await dataSource.query<
      { status: string; speed_kmh: string; lng: number; lat: number }[]
    >(
      `SELECT "status", "speed_kmh",
              ST_X("position") AS lng, ST_Y("position") AS lat
       FROM "vehicle_positions" WHERE "vehicle_id" = $1`,
      [vehicleId],
    );

    expect(row.status).toBe(VehicleStatus.InRoute);
    expect(Number(row.speed_kmh)).toBe(42);
    expect(Number(row.lng)).toBeCloseTo(-46.63, 5);
    expect(Number(row.lat)).toBeCloseTo(-23.55, 5);
  });

  it('deve permitir consulta por proximidade (PostGIS)', async () => {
    await service.saveMany([
      { vehicleId, lng: -46.63, lat: -23.55, speedKmh: 10, status: VehicleStatus.InRoute },
      { vehicleId, lng: -46.7, lat: -23.6, speedKmh: 10, status: VehicleStatus.InRoute },
    ]);

    const [row] = await dataSource.query<{ total: string }[]>(
      `SELECT count(*)::text AS total FROM "vehicle_positions"
       WHERE ST_DWithin("position"::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 5000)`,
      [-46.63, -23.55],
    );

    expect(row.total).toBe('1');
  });
});
