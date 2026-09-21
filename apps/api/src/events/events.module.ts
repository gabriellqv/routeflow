import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullQueues } from '@routeflow/contracts';
import { Redis } from 'ioredis';
import type { AppEnvironment } from '../config/app-environment.interface.js';
import { RedisModule } from '../redis/redis.module.js';
import { EventsConsumerService } from './events-consumer.service.js';

/**
 * Módulo de eventos em tempo real.
 *
 * Configura a fila de notificações (BullMQ) e registra o consumer da stream
 * `vehicles:events`, responsável por transformar os eventos do simulador em
 * jobs da fila `notifications`.
 *
 * A conexão é passada como uma instância de `Redis` já construída porque a API
 * roda como ESM: nesse modo o BullMQ exige um cliente instanciado em vez de
 * opções de conexão. `maxRetriesPerRequest: null` é obrigatório para workers.
 */
@Module({
  imports: [
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>) => ({
        connection: new Redis(configService.get('redisUrl', { infer: true }) as string, {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    BullModule.registerQueue({ name: BullQueues.notifications }),
  ],
  providers: [EventsConsumerService],
})
export class EventsModule {}
