import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

/**
 * Serviço responsável por encerrar a conexão com o Redis de forma limpa.
 *
 * Implementa `OnApplicationShutdown` para fechar o cliente ioredis durante o
 * desligamento da aplicação, evitando sockets e comandos pendentes.
 */
@Injectable()
export class RedisLifecycleService implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /**
   * Encerra a conexão com o Redis no shutdown da aplicação.
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
