import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { MaintenanceController } from './maintenance.controller.js';
import { Maintenance } from './maintenance.entity.js';
import { MaintenanceService } from './maintenance.service.js';

/**
 * Módulo de manutenções.
 *
 * Registra as entidades `Maintenance` e `Vehicle` (necessária para refletir o
 * status do veículo), expõe o CRUD de manutenções e disponibiliza o
 * `MaintenanceService`.
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Maintenance, Vehicle])],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
