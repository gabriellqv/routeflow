import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppEnvironment } from '../config/app-environment.interface.js';

/**
 * Módulo de acesso ao banco PostgreSQL (com extensão PostGIS).
 *
 * Configura a conexão do TypeORM de forma assíncrona, lendo a URL de conexão
 * do `ConfigService`. As entidades são carregadas automaticamente
 * (`autoLoadEntities`), evitando o registro manual a cada novo módulo de domínio.
 * As migrações são gerenciadas por um módulo dedicado (DataSource próprio), de
 * modo que `synchronize` permanece desabilitado para nunca alterar o esquema
 * em tempo de execução.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>) => ({
        type: 'postgres' as const,
        url: configService.get('databaseUrl', { infer: true }),
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
