import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  RedisStreams,
  VehicleEventType,
  WsEvents,
  type VehicleEventMessage,
} from '@routeflow/contracts';
import type { AddressInfo } from 'node:net';
import type { Redis } from 'ioredis';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { REDIS_CLIENT } from '../src/redis/redis.constants.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Aguarda um evento do socket com timeout, evitando travar a suíte.
 */
function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event);
      reject(new Error(`Timeout aguardando o evento "${event}"`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * Testes de integração (e2e) do push de notificações.
 *
 * Publica um evento na stream `vehicles:events` e verifica que o worker da fila
 * `notifications` o entrega a um cliente WebSocket autenticado no evento
 * `vehicle_event`. Requer Postgres e Redis em execução.
 */
describe('Notificações (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;
  let redis: Redis;
  let dataSource: DataSource;
  let vehicleId: string;
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    redis = app.get<Redis>(REDIS_CLIENT);
    dataSource = app.get(DataSource);

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'notificacoes@routeflow.dev', name: 'Operador', password: 'senha-secreta' });
    token = register.body.accessToken;
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "event_log", "vehicles" RESTART IDENTITY CASCADE');
    await redis.del(RedisStreams.vehiclesEvents);

    const [vehicle] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "vehicles" ("plate", "type", "model", "capacity_kg", "status")
       VALUES ('NOTF01', 'van', 'Sprinter', 1500, 'in_route') RETURNING "id"`,
    );
    vehicleId = vehicle.id;
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
  });

  afterAll(async () => {
    await redis.del(RedisStreams.vehiclesEvents).catch(() => undefined);
    await app.close();
  });

  it('deve entregar o evento ao cliente WebSocket autenticado', async () => {
    const socket = io(baseUrl, {
      path: '/ws',
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    await waitFor(socket, 'connect');

    const received = waitFor<{ event: string; data: VehicleEventMessage }>(
      socket,
      WsEvents.vehicleEvent,
    );

    const event: VehicleEventMessage = {
      vehicle_id: vehicleId,
      type: VehicleEventType.VehicleFault,
      payload: { code: 'E2E', description: 'Falha via notificação' },
      ts: new Date().toISOString(),
    };

    await redis.xadd(RedisStreams.vehiclesEvents, '*', 'data', JSON.stringify(event));

    const envelope = await received;
    expect(envelope.event).toBe(WsEvents.vehicleEvent);
    expect(envelope.data).toMatchObject(event);
  });
});
