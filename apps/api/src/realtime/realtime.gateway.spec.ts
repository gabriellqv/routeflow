import { Test } from '@nestjs/testing';
import type { VehiclePositionMessage } from '@routeflow/contracts';
import { RedisChannels, WsEvents } from '@routeflow/contracts';
import type { Redis } from 'ioredis';
import type { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * Cria um socket falso com os campos usados pelo gateway.
 */
function createSocket(
  auth: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): {
  socket: Socket;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
} {
  const emit = vi.fn();
  const disconnect = vi.fn();

  const socket = {
    handshake: { auth, headers },
    emit,
    disconnect,
  } as unknown as Socket;

  return { socket, emit, disconnect };
}

/**
 * Posição de exemplo publicada no canal `vehicles:positions`.
 */
function createPosition(overrides: Partial<VehiclePositionMessage> = {}): VehiclePositionMessage {
  return {
    vehicle_id: 'vehicle-1',
    lat: -23.55,
    lng: -46.63,
    speed_kmh: 42,
    status: 'in_route',
    route_id: 'route-1',
    stop_index: 2,
    ts: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let subscriber: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
  };
  let verify: ReturnType<typeof vi.fn>;
  let messageHandler: (channel: string, payload: string) => void;

  beforeEach(async () => {
    subscriber = {
      on: vi.fn((event: string, handler: (channel: string, payload: string) => void) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      }),
      subscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    verify = vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@routeflow.dev' });

    const redis = { duplicate: vi.fn(() => subscriber) } as unknown as Redis;

    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: AuthService, useValue: { verify } },
      ],
    }).compile();

    gateway = moduleRef.get(RealtimeGateway);
    await gateway.onModuleInit();
  });

  afterEach(async () => {
    await gateway.onApplicationShutdown();
    vi.useRealTimers();
  });

  it('deve assinar o canal de posições em uma conexão dedicada', () => {
    expect(subscriber.subscribe).toHaveBeenCalledWith(RedisChannels.vehiclesPositions);
  });

  it('deve autenticar e registrar um cliente com token válido', async () => {
    const { socket, disconnect } = createSocket({ token: 'jwt-valido' });

    await gateway.handleConnection(socket);

    expect(verify).toHaveBeenCalledWith('jwt-valido');
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('deve aceitar o token enviado no cabeçalho Authorization', async () => {
    const { socket, disconnect } = createSocket({}, { authorization: 'Bearer jwt-valido' });

    await gateway.handleConnection(socket);

    expect(verify).toHaveBeenCalledWith('jwt-valido');
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('deve desconectar o cliente quando o token é inválido', async () => {
    verify.mockRejectedValueOnce(new Error('token inválido'));
    const { socket, emit, disconnect } = createSocket({ token: 'invalido' });

    await gateway.handleConnection(socket);

    expect(emit).toHaveBeenCalledWith('unauthorized', {
      message: 'Token inválido ou expirado',
    });
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('deve desconectar o cliente quando não há token', async () => {
    const { socket, disconnect } = createSocket();

    await gateway.handleConnection(socket);

    expect(verify).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('deve emitir as posições agregadas no evento vehicle_positions', async () => {
    vi.useFakeTimers();
    const { socket, emit } = createSocket({ token: 'jwt-valido' });
    await gateway.handleConnection(socket);

    const position = createPosition();
    messageHandler(RedisChannels.vehiclesPositions, JSON.stringify(position));

    expect(emit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(WsEvents.vehiclePositions, {
      event: WsEvents.vehiclePositions,
      data: [position],
    });
  });

  it('deve manter apenas a última posição de cada veículo na janela', async () => {
    vi.useFakeTimers();
    const { socket, emit } = createSocket({ token: 'jwt-valido' });
    await gateway.handleConnection(socket);

    const first = createPosition({ speed_kmh: 10 });
    const second = createPosition({ speed_kmh: 80 });
    messageHandler(RedisChannels.vehiclesPositions, JSON.stringify(first));
    messageHandler(RedisChannels.vehiclesPositions, JSON.stringify(second));

    vi.advanceTimersByTime(100);

    expect(emit).toHaveBeenCalledWith(WsEvents.vehiclePositions, {
      event: WsEvents.vehiclePositions,
      data: [second],
    });
  });

  it('não deve emitir nada após a desconexão do cliente', async () => {
    vi.useFakeTimers();
    const { socket, emit } = createSocket({ token: 'jwt-valido' });
    await gateway.handleConnection(socket);
    gateway.handleDisconnect(socket);

    messageHandler(RedisChannels.vehiclesPositions, JSON.stringify(createPosition()));
    vi.advanceTimersByTime(100);

    expect(emit).not.toHaveBeenCalled();
  });

  it('não deve quebrar ao receber uma posição inválida', async () => {
    vi.useFakeTimers();
    const { socket, emit } = createSocket({ token: 'jwt-valido' });
    await gateway.handleConnection(socket);

    expect(() => messageHandler(RedisChannels.vehiclesPositions, '{invalido')).not.toThrow();
    vi.advanceTimersByTime(100);

    expect(emit).not.toHaveBeenCalled();
  });

  it('deve encerrar a conexão de subscriber no shutdown', async () => {
    await gateway.onApplicationShutdown();

    expect(subscriber.quit).toHaveBeenCalledOnce();
  });
});
