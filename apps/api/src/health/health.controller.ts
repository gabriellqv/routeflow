import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health.js';

/**
 * Controlador de health check da API.
 *
 * Expõe o endpoint `/health`, verificando as dependências de infraestrutura
 * (PostgreSQL/PostGIS e Redis). Ideal para sondas de liveness/readiness em
 * ambientes conteinerizados e orquestradores.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrmIndicator: TypeOrmHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  /**
   * Executa as verificações de saúde registradas.
   *
   * @returns Relatório agregado com o status de cada dependência.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verifica a saúde da API e suas dependências' })
  check() {
    return this.health.check([
      () => this.typeOrmIndicator.pingCheck('database'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }
}
