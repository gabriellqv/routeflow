import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '../redis/redis.module.js';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis.health.js';

/**
 * Módulo de health check.
 *
 * Agrega o `TerminusModule` com os indicadores customizados da aplicação e
 * registra o `HealthController` responsável pelo endpoint `/health`.
 */
@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
