import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { RoutingModule } from '../routing/routing.module.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { Route } from './route.entity.js';
import { RoutesController } from './routes.controller.js';
import { RoutesService } from './routes.service.js';

/**
 * Módulo de rotas.
 *
 * Registra as entidades `Route` e `Vehicle` (necessárias para a atribuição
 * 1—1), integra o motor de roteamento viário, expõe o CRUD de rotas e disponibiliza o `RoutesService`.
 */
@Module({
  imports: [AuthModule, RoutingModule, TypeOrmModule.forFeature([Route, Vehicle])],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
