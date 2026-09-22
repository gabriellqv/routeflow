import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BullQueues, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

/**
 * Worker da fila `notifications`.
 *
 * Consome os eventos enfileirados pelo consumer da stream e faz o push aos
 * clientes WebSocket conectados através do `RealtimeGateway`, no evento
 * `vehicle_event`.
 */
@Processor(BullQueues.notifications)
export class NotificationsWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationsWorker.name);

  constructor(private readonly gateway: RealtimeGateway) {
    super();
  }

  /**
   * Processa um job de notificação, emitindo o evento aos clientes.
   *
   * @param job Job enfileirado com o `VehicleEventMessage`.
   */
  async process(job: Job<VehicleEventMessage>): Promise<void> {
    this.gateway.emitVehicleEvent(job.data);
  }
}
