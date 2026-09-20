import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Route } from '../routes/route.entity.js';
import { DeliveriesController } from './deliveries.controller.js';
import { DeliveriesService } from './deliveries.service.js';
import { Delivery } from './delivery.entity.js';

/**
 * Módulo de entregas.
 *
 * Registra as entidades `Delivery` e `Route` (necessária para validar a rota),
 * expõe o CRUD de entregas e disponibiliza o `DeliveriesService`.
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Delivery, Route])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
