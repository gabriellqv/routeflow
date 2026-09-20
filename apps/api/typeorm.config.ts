import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { envValidationSchema } from './src/config/env.validation.js';

// Carrega as variáveis de ambiente do monorepo antes de validar.
loadEnv({ path: ['../../.env', '.env'], quiet: true });

/**
 * Valida as variáveis de ambiente necessárias para o CLI do TypeORM.
 *
 * O CLI roda fora do contexto do Nest, portanto a validação é executada
 * manualmente para manter o mesmo comportamento de fail-fast da aplicação.
 */
function resolveDatabaseUrl(): string {
  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Configuração de ambiente inválida: ${error.message}`);
  }

  return value.DATABASE_URL as string;
}

/**
 * DataSource utilizado exclusivamente pelo CLI do TypeORM (migrations).
 *
 * Mantido separado do `DatabaseModule` da aplicação, que usa a mesma URL,
 * porém sem carregar entidades/migrations no runtime.
 */
export default new DataSource({
  type: 'postgres',
  url: resolveDatabaseUrl(),
  uuidExtension: 'pgcrypto',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
