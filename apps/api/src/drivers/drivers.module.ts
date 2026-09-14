import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { Driver } from './driver.entity.js';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';

/**
 * Módulo de motoristas.
 *
 * Registra as entidades `Driver` e `Vehicle` (necessárias para a relação 1—1),
 * expõe o CRUD de motoristas e disponibiliza o `DriversService`.
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Driver, Vehicle])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
