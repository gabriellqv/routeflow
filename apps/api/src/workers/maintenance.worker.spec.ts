import { Test } from '@nestjs/testing';
import { VehicleEventType, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { MaintenanceService } from '../maintenance/maintenance.service.js';
import { MaintenanceWorker } from './maintenance.worker.js';

/** Cria um job falso com o payload de evento. */
function createJob(event: VehicleEventMessage): Job<VehicleEventMessage> {
  return { data: event } as Job<VehicleEventMessage>;
}

describe('MaintenanceWorker', () => {
  let worker: MaintenanceWorker;
  let service: {
    markStarted: ReturnType<typeof vi.fn>;
    markCompleted: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = { markStarted: vi.fn(), markCompleted: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [MaintenanceWorker, { provide: MaintenanceService, useValue: service }],
    }).compile();

    worker = moduleRef.get(MaintenanceWorker);
  });

  it('deve iniciar a manutenção', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.MaintenanceStarted,
        payload: { maintenance_id: 'maint-1' },
        ts: 'now',
      }),
    );

    expect(service.markStarted).toHaveBeenCalledWith('maint-1');
    expect(service.markCompleted).not.toHaveBeenCalled();
  });

  it('deve concluir a manutenção', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.MaintenanceCompleted,
        payload: { maintenance_id: 'maint-1' },
        ts: 'now',
      }),
    );

    expect(service.markCompleted).toHaveBeenCalledWith('maint-1');
  });

  it('deve ignorar eventos sem maintenance_id', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.MaintenanceStarted,
        payload: {},
        ts: 'now',
      }),
    );

    expect(service.markStarted).not.toHaveBeenCalled();
  });

  it('deve ignorar eventos de outros tipos', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.DeliveryCompleted,
        payload: { maintenance_id: 'maint-1' },
        ts: 'now',
      }),
    );

    expect(service.markStarted).not.toHaveBeenCalled();
    expect(service.markCompleted).not.toHaveBeenCalled();
  });
});
