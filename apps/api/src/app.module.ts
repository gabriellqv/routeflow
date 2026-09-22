import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { DriversModule } from './drivers/drivers.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthModule } from './health/health.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';
import { PositionsModule } from './positions/positions.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RoutesModule } from './routes/routes.module.js';
import { UsersModule } from './users/users.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { WorkersModule } from './workers/workers.module.js';

/**
 * Módulo raiz da API.
 *
 * Compõe os módulos globais de configuração, os módulos de infraestrutura
 * (banco de dados e Redis) e os módulos de domínio.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    DriversModule,
    RoutesModule,
    DeliveriesModule,
    MaintenanceModule,
    PositionsModule,
    RealtimeModule,
    EventsModule,
    WorkersModule,
  ],
})
export class AppModule {}
