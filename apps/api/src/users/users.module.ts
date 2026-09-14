import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

/**
 * Módulo de usuários.
 *
 * Registra a entidade `User` e expõe o `UsersService` para os demais módulos
 * que necessitam consultar ou criar usuários (ex.: autenticação).
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
