import { TestBed } from '@angular/core/testing';
import { WsEvents, type VehiclePositionsEnvelope } from '@routeflow/contracts';
import { WS_URL } from './api-config';
import { AuthStore } from './auth.store';
import { RealtimeService } from './realtime.service';

/** Mock minimalista do socket do socket.io-client. */
interface FakeSocket {
  handlers: Map<string, (payload: unknown) => void>;
  managerHandlers: Map<string, (payload: unknown) => void>;
  on: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
  io: {
    on: ReturnType<typeof vi.fn>;
    opts: { reconnection: boolean };
    emit: (event: string, payload?: unknown) => void;
  };
  options: { auth?: (callback: (data: { token: string | null }) => void) => void };
}

let socket: FakeSocket;
const ioMock = vi.fn<(url: string, options?: unknown) => FakeSocket>((_url, options) => {
  socket.options = options as FakeSocket['options'];
  return socket;
});

vi.mock('socket.io-client', () => ({
  io: (url: string, options?: unknown) => ioMock(url, options),
}));

describe('RealtimeService', () => {
  let service: RealtimeService;
  let authStore: AuthStore;
  const wsUrl = 'ws://localhost:3000';

  beforeEach(() => {
    socket = {
      handlers: new Map(),
      managerHandlers: new Map(),
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        socket.handlers.set(event, handler);
      }),
      disconnect: vi.fn(),
      emit: (event: string, payload: unknown) => socket.handlers.get(event)?.(payload),
      io: {
        on: vi.fn((event: string, handler: (payload: unknown) => void) => {
          socket.managerHandlers.set(event, handler);
        }),
        opts: { reconnection: true },
        emit: (event: string, payload?: unknown) => socket.managerHandlers.get(event)?.(payload),
      },
      options: {},
    };
    ioMock.mockClear();

    TestBed.configureTestingModule({
      providers: [{ provide: WS_URL, useValue: wsUrl }],
    });

    service = TestBed.inject(RealtimeService);
    authStore = TestBed.inject(AuthStore);
    localStorage.clear();
  });

  afterEach(() => {
    service.disconnect();
    localStorage.clear();
  });

  it('deve conectar ao gateway com o token da sessão', () => {
    authStore.setToken('jwt-token');

    service.connect();

    expect(ioMock).toHaveBeenCalledWith(wsUrl, expect.objectContaining({ path: '/ws' }));
    expect(typeof socket.options.auth).toBe('function');
  });

  it('deve resolver o token atual a cada tentativa de autenticação', () => {
    authStore.setToken('token-inicial');
    service.connect();

    let resolved: { token: string | null } | undefined;
    socket.options.auth?.((data) => {
      resolved = data;
    });
    expect(resolved).toEqual({ token: 'token-inicial' });

    authStore.setToken('token-renovado');
    socket.options.auth?.((data) => {
      resolved = data;
    });
    expect(resolved).toEqual({ token: 'token-renovado' });
  });

  it('não deve abrir duas conexões simultâneas', () => {
    service.connect();
    service.connect();

    expect(ioMock).toHaveBeenCalledOnce();
  });

  it('deve atualizar o status conforme os eventos do socket', () => {
    service.connect();

    socket.emit('connect', undefined);
    expect(service.status()).toBe('connected');

    socket.emit('disconnect', undefined);
    expect(service.status()).toBe('disconnected');
  });

  it('deve acumular as posições recebidas por veículo', () => {
    service.connect();

    const envelope: VehiclePositionsEnvelope = {
      event: WsEvents.vehiclePositions,
      data: [
        {
          vehicle_id: 'v1',
          lat: -23.55,
          lng: -46.63,
          speed_kmh: 40,
          status: 'in_route',
          route_id: 'r1',
          stop_index: 0,
          ts: new Date().toISOString(),
        },
      ],
    };

    socket.emit(WsEvents.vehiclePositions, envelope);

    expect(service.vehicles().get('v1')?.speed_kmh).toBe(40);
  });

  it('deve expor o último evento de veículo', () => {
    service.connect();

    socket.emit(WsEvents.vehicleEvent, {
      vehicle_id: 'v1',
      type: 'vehicle_fault',
      payload: {},
      ts: new Date().toISOString(),
    });

    expect(service.lastEvent()?.type).toBe('vehicle_fault');
  });

  it('deve esquecer um veículo removido', () => {
    service.connect();
    socket.emit(WsEvents.vehiclePositions, {
      event: WsEvents.vehiclePositions,
      data: [
        {
          vehicle_id: 'v1',
          lat: 0,
          lng: 0,
          speed_kmh: 0,
          status: 'stopped',
          route_id: 'r1',
          stop_index: 0,
          ts: 'now',
        },
      ],
    });

    service.forget('v1');

    expect(service.vehicles().has('v1')).toBe(false);
  });

  it('deve encerrar a conexão no disconnect', () => {
    service.connect();
    service.disconnect();

    expect(socket.disconnect).toHaveBeenCalled();
    expect(service.status()).toBe('disconnected');
  });

  it('deve contar as tentativas de reconexão', () => {
    service.connect();

    socket.io.emit('reconnect_attempt');
    socket.io.emit('reconnect_attempt');

    expect(service.reconnectAttempts()).toBe(2);

    socket.emit('connect', undefined);
    expect(service.reconnectAttempts()).toBe(0);
  });

  it('deve interromper a reconexão após unauthorized', () => {
    service.connect();

    socket.emit('unauthorized', { message: 'Token inválido' });

    expect(socket.io.opts.reconnection).toBe(false);
    expect(socket.disconnect).toHaveBeenCalled();
    expect(service.status()).toBe('disconnected');
  });
});
