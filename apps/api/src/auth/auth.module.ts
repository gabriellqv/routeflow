import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { AppEnvironment } from '../config/app-environment.interface.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Módulo de autenticação.
 *
 * Configura o `JwtModule` com o segredo e o tempo de expiração definidos no
 * ambiente, registra o serviço/controlador de autenticação e exporta o
 * `JwtAuthGuard` para proteção de rotas em outros módulos.
 */
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>): JwtModuleOptions => ({
        secret: configService.get('jwtSecret', { infer: true }),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
