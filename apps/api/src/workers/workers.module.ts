import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullQueues } from '@routeflow/contracts';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';
import { MaintenanceModule } from '../maintenance/maintenance.module.js';
import { PositionsModule } from '../positions/positions.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { DeliveriesWorker } from './deliveries.worker.js';
import { MaintenanceWorker } from './maintenance.worker.js';
import { NotificationsWorker } from './notifications.worker.js';
import {
  PositionSnapshotsScheduler,
  PositionSnapshotsWorker,
} from './position-snapshots.worker.js';

/**
 * Módulo de workers assíncronos.
 *
 * Registra as filas `deliveries`, `maintenance`, `notifications` e
 * `position-snapshots` e os workers que aplicam os eventos no banco, fazem o
 * push via WebSocket e persistem o histórico de posições.
 */
@Module({
  imports: [
    QueueModule,
    RedisModule,
    RealtimeModule,
    DeliveriesModule,
    MaintenanceModule,
    PositionsModule,
    VehiclesModule,
    BullModule.registerQueue(
      { name: BullQueues.deliveries },
      { name: BullQueues.maintenance },
      { name: BullQueues.notifications },
      { name: BullQueues.positionSnapshots },
    ),
  ],
  providers: [
    DeliveriesWorker,
    MaintenanceWorker,
    NotificationsWorker,
    PositionSnapshotsWorker,
    PositionSnapshotsScheduler,
  ],
})
export class WorkersModule {}
