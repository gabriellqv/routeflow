import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullQueues } from '@routeflow/contracts';
import { PositionsModule } from '../positions/positions.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { EventsConsumerService } from './events-consumer.service.js';

/**
 * Módulo de eventos em tempo real.
 *
 * Registra o consumer da stream `vehicles:events`, responsável por persistir os
 * eventos (`event_log`) e transformá-los em jobs das filas `notifications`,
 * `deliveries` e `maintenance`.
 */
@Module({
  imports: [
    RedisModule,
    QueueModule,
    PositionsModule,
    BullModule.registerQueue(
      { name: BullQueues.notifications },
      { name: BullQueues.deliveries },
      { name: BullQueues.maintenance },
    ),
  ],
  providers: [EventsConsumerService],
})
export class EventsModule {}
