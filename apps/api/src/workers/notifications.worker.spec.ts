import { Test } from '@nestjs/testing';
import { VehicleEventType, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { NotificationsWorker } from './notifications.worker.js';

/** Cria um job falso com o payload de evento. */
function createJob(event: VehicleEventMessage): Job<VehicleEventMessage> {
  return { data: event } as Job<VehicleEventMessage>;
}

describe('NotificationsWorker', () => {
  let worker: NotificationsWorker;
  let gateway: { emitVehicleEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    gateway = { emitVehicleEvent: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [NotificationsWorker, { provide: RealtimeGateway, useValue: gateway }],
    }).compile();

    worker = moduleRef.get(NotificationsWorker);
  });

  it('deve emitir o evento pelo gateway', async () => {
    const event: VehicleEventMessage = {
      vehicle_id: 'vehicle-1',
      type: VehicleEventType.VehicleFault,
      payload: { code: 'E1', description: 'Falha' },
      ts: 'now',
    };

    await worker.process(createJob(event));

    expect(gateway.emitVehicleEvent).toHaveBeenCalledWith(event);
  });
});
