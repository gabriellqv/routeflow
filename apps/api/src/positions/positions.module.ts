import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { EventLog } from './event-log.entity.js';
import { EventLogService } from './event-log.service.js';
import { VehiclePosition } from './vehicle-position.entity.js';
import { VehiclePositionsService } from './vehicle-positions.service.js';

/**
 * Módulo de histórico (posições e eventos).
 *
 * Registra as entidades `VehiclePosition` e `EventLog` e expõe os serviços de
 * persistência usados pelo worker de snapshots e pelo consumer de eventos.
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([VehiclePosition, EventLog, Vehicle])],
  providers: [VehiclePositionsService, EventLogService],
  exports: [VehiclePositionsService, EventLogService],
})
export class PositionsModule {}
