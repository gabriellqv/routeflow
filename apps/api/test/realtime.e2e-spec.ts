import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisChannels, WsEvents } from '@routeflow/contracts';
import type { AddressInfo } from 'node:net';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import type { Redis } from 'ioredis';
import { AppModule } from '../src/app.module.js';
import { REDIS_CLIENT } from '../src/redis/redis.constants.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Aguarda um evento do socket com timeout, evitando travar a suíte.
 */
function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 3000): Promise<T> {
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
 * Testes de integração (e2e) do gateway de tempo real.
 *
 * Validam a autenticação JWT no handshake, a assinatura do canal de posições no
 * Redis e o repasse das mensagens agregadas no evento `vehicle_positions`.
 * Requerem Redis em execução.
 */
describe('Tempo real (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;
  let publisher: Redis;
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

    // Conexão de publicação, separada do subscriber do gateway.
    publisher = app.get<Redis>(REDIS_CLIENT).duplicate();

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'tempo-real@routeflow.dev', name: 'Operador', password: 'senha-secreta' });

    token = register.body.accessToken;
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
  });

  afterAll(async () => {
    await publisher.quit();
    await app.close();
  });

  /**
   * Abre um cliente WebSocket apontando para o gateway.
   */
  function connect(auth: Record<string, unknown>): ClientSocket {
    const socket = io(baseUrl, {
      path: '/ws',
      auth,
      transports: ['websocket'],
      reconnection: false,
    });

    sockets.push(socket);
    return socket;
  }

  it('deve recusar a conexão sem token válido', async () => {
    const socket = connect({});

    const payload = await waitFor<{ message: string }>(socket, 'unauthorized');
    expect(payload.message).toBe('Token inválido ou expirado');
    expect(socket.connected).toBe(false);
  });

  it('deve autenticar e repassar as posições publicadas no Redis', async () => {
    const socket = connect({ token });
    await waitFor(socket, 'connect');

    const position = {
      vehicle_id: 'vehicle-e2e',
      lat: -23.55,
      lng: -46.63,
      speed_kmh: 55,
      status: 'in_route',
      route_id: 'route-e2e',
      stop_index: 1,
      ts: new Date().toISOString(),
    };

    const received = waitFor<{ event: string; data: unknown[] }>(socket, WsEvents.vehiclePositions);

    await publisher.publish(RedisChannels.vehiclesPositions, JSON.stringify(position));

    const envelope = await received;
    expect(envelope.event).toBe(WsEvents.vehiclePositions);
    expect(envelope.data).toEqual([position]);
  });

  it('deve aceitar o token no cabeçalho Authorization', async () => {
    const socket = io(baseUrl, {
      path: '/ws',
      extraHeaders: { Authorization: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);

    await waitFor(socket, 'connect');
    expect(socket.connected).toBe(true);
  });
});
