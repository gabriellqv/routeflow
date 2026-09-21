import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * Módulo de tempo real.
 *
 * Registra o gateway WebSocket que assina o canal de posições do Redis e
 * repassa os dados agregados aos clientes conectados.
 */
@Module({
  imports: [RedisModule, AuthModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
