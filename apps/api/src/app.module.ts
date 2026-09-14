import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { RedisModule } from './redis/redis.module.js';

/**
 * Módulo raiz da API.
 *
 * Compõe os módulos globais de configuração e os módulos de infraestrutura
 * (banco de dados e Redis), além do health check. Os módulos de domínio
 * (veículos, motoristas, rotas, entregas, manutenção) são adicionados nas
 * etapas seguintes.
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, RedisModule, HealthModule],
})
export class AppModule {}
