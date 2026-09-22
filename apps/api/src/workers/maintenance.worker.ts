import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BullQueues, VehicleEventType, type VehicleEventMessage } from '@routeflow/contracts';
import type { Job } from 'bullmq';
import { MaintenanceService } from '../maintenance/maintenance.service.js';

/**
 * Worker da fila `maintenance`.
 *
 * Consome os eventos de manutenção (`maintenance_started`/
 * `maintenance_completed`) e aplica o ciclo de vida no banco, refletindo no
 * status do veículo. Eventos de outros tipos são ignorados.
 */
@Processor(BullQueues.maintenance)
export class MaintenanceWorker extends WorkerHost {
  private readonly logger = new Logger(MaintenanceWorker.name);

  constructor(private readonly maintenanceService: MaintenanceService) {
    super();
  }

  /**
   * Processa um job de evento de manutenção.
   *
   * @param job Job enfileirado com o `VehicleEventMessage`.
   */
  async process(job: Job<VehicleEventMessage>): Promise<void> {
    const event = job.data;
    const maintenanceId = event.payload?.['maintenance_id'] as string | undefined;

    if (!maintenanceId) {
      this.logger.warn(`Evento ${event.type} sem maintenance_id; ignorado`);
      return;
    }

    switch (event.type) {
      case VehicleEventType.MaintenanceStarted:
        await this.maintenanceService.markStarted(maintenanceId);
        break;
      case VehicleEventType.MaintenanceCompleted:
        await this.maintenanceService.markCompleted(maintenanceId);
        break;
      default:
        this.logger.debug(`Evento ${event.type} não tratado pelo worker de manutenção`);
    }
  }
}
