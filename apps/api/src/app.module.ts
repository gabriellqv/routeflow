import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { RedisModule } from './redis/redis.module.js';
import { UsersModule } from './users/users.module.js';

/**
 * Módulo raiz da API.
 *
 * Compõe os módulos globais de configuração, os módulos de infraestrutura
 * (banco de dados e Redis) e os módulos de domínio. Os módulos de veículos,
 * motoristas, rotas, entregas e manutenção são adicionados nas etapas seguintes.
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, RedisModule, HealthModule, UsersModule, AuthModule],
})
export class AppModule {}
