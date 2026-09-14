import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Driver } from '../drivers/driver.entity.js';
import { Vehicle } from './vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * Módulo de veículos.
 *
 * Registra as entidades `Vehicle` e `Driver` (necessárias para a relação 1—1),
 * expõe o CRUD de veículos e disponibiliza o `VehiclesService` e o repositório
 * de veículos para outros módulos (ex.: motoristas).
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Vehicle, Driver])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService, TypeOrmModule],
})
export class VehiclesModule {}
