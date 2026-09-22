import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BullQueues, VehicleEventType, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { DeliveriesService } from '../deliveries/deliveries.service.js';

/**
 * Worker da fila `deliveries`.
 *
 * Consome os eventos de entrega (`delivery_started`/`delivery_completed`) e
 * atualiza o status da entrega no banco. Eventos de outros tipos são ignorados.
 */
@Processor(BullQueues.deliveries)
export class DeliveriesWorker extends WorkerHost {
  private readonly logger = new Logger(DeliveriesWorker.name);

  constructor(private readonly deliveriesService: DeliveriesService) {
    super();
  }

  /**
   * Processa um job de evento de entrega.
   *
   * @param job Job enfileirado com o `VehicleEventMessage`.
   */
  async process(job: Job<VehicleEventMessage>): Promise<void> {
    const event = job.data;
    const stopId = event.payload?.['stop_id'] as string | undefined;

    if (!stopId) {
      this.logger.warn(`Evento ${event.type} sem stop_id; ignorado`);
      return;
    }

    switch (event.type) {
      case VehicleEventType.DeliveryStarted:
        await this.deliveriesService.markStarted(stopId);
        break;
      case VehicleEventType.DeliveryCompleted:
        await this.deliveriesService.markCompleted(stopId);
        break;
      default:
        this.logger.debug(`Evento ${event.type} não tratado pelo worker de entregas`);
    }
  }
}
