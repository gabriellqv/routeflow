import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppEnvironment } from '../config/app-environment.interface.js';

/**
 * Caminho (glob) das migrations, resolvido para funcionar tanto a partir do
 * código-fonte (`.ts`, em desenvolvimento/testes) quanto do build (`.js`).
 */
const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsGlob = join(currentDir, 'migrations', '*{.ts,.js}').replace(/\\/g, '/');

/**
 * Módulo de acesso ao banco PostgreSQL (com extensão PostGIS).
 *
 * Configura a conexão do TypeORM de forma assíncrona, lendo a URL de conexão
 * do `ConfigService`. As entidades são carregadas automaticamente
 * (`autoLoadEntities`) e as migrations são aplicadas na inicialização
 * (`migrationsRun`). `synchronize` permanece desabilitado: o esquema só é
 * alterado por migrations versionadas, nunca em tempo de execução.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment>) => ({
        type: 'postgres' as const,
        url: configService.get('databaseUrl', { infer: true }),
        uuidExtension: 'pgcrypto' as const,
        autoLoadEntities: true,
        synchronize: false,
        migrations: [migrationsGlob],
        migrationsRun: true,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
