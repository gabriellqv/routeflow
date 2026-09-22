import { Test } from '@nestjs/testing';
import { RedisKeys, type VehicleState } from '@routeflow/contracts';
import type { Redis } from 'ioredis';
import { VehiclePositionsService } from '../positions/vehicle-positions.service.js';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import {
  PositionSnapshotsScheduler,
  PositionSnapshotsWorker,
} from './position-snapshots.worker.js';

describe('PositionSnapshotsWorker', () => {
  let worker: PositionSnapshotsWorker;
  let redis: {
    zrange: ReturnType<typeof vi.fn>;
    hget: ReturnType<typeof vi.fn>;
  };
  let positions: { saveMany: ReturnType<typeof vi.fn> };

  const state: VehicleState = {
    lat: -23.55,
    lng: -46.63,
    speed_kmh: 42,
    status: 'in_route',
    route_id: 'route-1',
    stop_index: 0,
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    redis = {
      zrange: vi.fn().mockResolvedValue(['vehicle-1']),
      hget: vi.fn().mockResolvedValue(JSON.stringify(state)),
    };
    positions = { saveMany: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PositionSnapshotsWorker,
        { provide: REDIS_CLIENT, useValue: redis as unknown as Redis },
        { provide: VehiclePositionsService, useValue: positions },
      ],
    }).compile();

    worker = moduleRef.get(PositionSnapshotsWorker);
  });

  it('deve ler o estado do Redis e persistir snapshots', async () => {
    await worker.process({ name: 'position-snapshot' } as never);

    expect(redis.zrange).toHaveBeenCalledWith(RedisKeys.vehiclesGeo, 0, '-1');
    expect(positions.saveMany).toHaveBeenCalledWith([
      { vehicleId: 'vehicle-1', lng: -46.63, lat: -23.55, speedKmh: 42, status: 'in_route' },
    ]);
  });

  it('não deve gravar quando não há veículos no índice geo', async () => {
    redis.zrange.mockResolvedValue([]);

    await worker.process({ name: 'position-snapshot' } as never);

    expect(positions.saveMany).not.toHaveBeenCalled();
  });

  it('deve ignorar estado inválido sem quebrar', async () => {
    redis.hget.mockResolvedValue('{invalido');

    await worker.process({ name: 'position-snapshot' } as never);

    expect(positions.saveMany).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando a persistência falha', async () => {
    positions.saveMany.mockRejectedValue(new Error('db indisponível'));

    await expect(worker.process({ name: 'position-snapshot' } as never)).rejects.toThrow(
      'db indisponível',
    );
  });
});

describe('PositionSnapshotsScheduler', () => {
  it('deve agendar o job recorrente de snapshots', async () => {
    const queue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PositionSnapshotsScheduler,
        { provide: 'BullQueue_position-snapshots', useValue: queue },
      ],
    }).compile();

    await moduleRef.get(PositionSnapshotsScheduler).onModuleInit();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'position-snapshot',
      { every: 15000 },
      { name: 'position-snapshot' },
    );
  });
});
