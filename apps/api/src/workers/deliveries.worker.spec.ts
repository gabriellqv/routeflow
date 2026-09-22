import { Test } from '@nestjs/testing';
import { VehicleEventType, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { DeliveriesWorker } from './deliveries.worker.js';

/** Cria um job falso com o payload de evento. */
function createJob(event: VehicleEventMessage): Job<VehicleEventMessage> {
  return { data: event } as Job<VehicleEventMessage>;
}

describe('DeliveriesWorker', () => {
  let worker: DeliveriesWorker;
  let service: {
    markStarted: ReturnType<typeof vi.fn>;
    markCompleted: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = { markStarted: vi.fn(), markCompleted: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [DeliveriesWorker, { provide: DeliveriesService, useValue: service }],
    }).compile();

    worker = moduleRef.get(DeliveriesWorker);
  });

  it('deve marcar a entrega como iniciada', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.DeliveryStarted,
        payload: { stop_id: 'stop-1' },
        ts: 'now',
      }),
    );

    expect(service.markStarted).toHaveBeenCalledWith('stop-1');
    expect(service.markCompleted).not.toHaveBeenCalled();
  });

  it('deve marcar a entrega como concluída', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.DeliveryCompleted,
        payload: { stop_id: 'stop-1' },
        ts: 'now',
      }),
    );

    expect(service.markCompleted).toHaveBeenCalledWith('stop-1');
  });

  it('deve ignorar eventos sem stop_id', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.DeliveryCompleted,
        payload: {},
        ts: 'now',
      }),
    );

    expect(service.markCompleted).not.toHaveBeenCalled();
  });

  it('deve ignorar eventos de outros tipos', async () => {
    await worker.process(
      createJob({
        vehicle_id: 'v1',
        type: VehicleEventType.VehicleFault,
        payload: { stop_id: 'stop-1' },
        ts: 'now',
      }),
    );

    expect(service.markStarted).not.toHaveBeenCalled();
    expect(service.markCompleted).not.toHaveBeenCalled();
  });
});
