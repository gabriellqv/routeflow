import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppEnvironment } from '../config/app-environment.interface.js';
import { RedisLifecycleService } from './redis-lifecycle.service.js';
import { REDIS_CLIENT } from './redis.constants.js';

/**
 * Módulo do cliente Redis.
 *
 * Disponibiliza uma instância única de `Redis` (ioredis) para toda a aplicação,
 * utilizada como barramento de estado rápido, pub/sub e streams. A conexão é
 * encerrada de forma limpa no desligamento da aplicação através do
 * `RedisLifecycleService`.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>): Redis => {
        const client = new Redis(configService.get('redisUrl', { infer: true }) as string, {
          maxRetriesPerRequest: 3,
        });

        // O erro é registrado para evitar rejeições não tratadas que
        // derrubariam o processo; a indisponibilidade é refletida no health check.
        client.on('error', (error: Error) => {
          console.error('[redis] erro de conexão:', error.message);
        });

        return client;
      },
    },
    RedisLifecycleService,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
