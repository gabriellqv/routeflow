import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullQueues } from '@routeflow/contracts';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';
import { MaintenanceModule } from '../maintenance/maintenance.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { DeliveriesWorker } from './deliveries.worker.js';
import { MaintenanceWorker } from './maintenance.worker.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';

/**
 * Módulo de workers assíncronos.
 *
 * Registra as filas `deliveries` e `maintenance` e os workers que aplicam os
 * eventos de entrega/manutenção no banco de dados.
 */
@Module({
  imports: [
    QueueModule,
    DeliveriesModule,
    MaintenanceModule,
    VehiclesModule,
    BullModule.registerQueue({ name: BullQueues.deliveries }, { name: BullQueues.maintenance }),
  ],
  providers: [DeliveriesWorker, MaintenanceWorker],
})
export class WorkersModule {}
