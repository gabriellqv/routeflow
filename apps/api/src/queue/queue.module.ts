import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppEnvironment } from '../config/app-environment.interface.js';

/**
 * Módulo global de filas (BullMQ).
 *
 * Registra a conexão com o Redis usada por todas as filas/workers. A conexão é
 * uma instância de `Redis` já construída porque a API roda como ESM: nesse modo
 * o BullMQ exige um cliente instanciado em vez de opções de conexão.
 * `maxRetriesPerRequest: null` é obrigatório para workers.
 *
 * Os módulos interessados importam este módulo e registram suas próprias filas
 * com `BullModule.registerQueue(...)`.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>) => ({
        connection: new Redis(configService.get('redisUrl', { infer: true }) as string, {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
