import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';

/**
 * Indicador de saúde da conexão com o Redis.
 *
 * Executa um `PING` no cliente ioredis e reporta o status ao Terminus. É
 * utilizado pelo endpoint `/health` para expor a disponibilidade do Redis.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(REDIS_CLIENT) private readonly client: Redis,
  ) {}

  /**
   * Verifica a conectividade com o Redis.
   *
   * @param key Chave do indicador no relatório de saúde.
   * @returns Resultado indicando `up` ou `down` conforme a resposta do `PING`.
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const response = await this.client.ping();

      if (response !== 'PONG') {
        return indicator.down({ message: 'Resposta inesperada do PING' });
      }

      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return indicator.down({ message });
    }
  }
}
