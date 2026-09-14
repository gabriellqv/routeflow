import type { AppEnvironment } from './app-environment.interface.js';

/**
 * Constrói o objeto de configuração tipado a partir das variáveis de ambiente.
 *
 * É registrado no `ConfigModule` através da opção `load`, permitindo o acesso
 * por chaves agrupadas (ex.: `config.get('port')`) em vez de variáveis soltas.
 *
 * @returns Configuração tipada da aplicação.
 */
export default (): AppEnvironment => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as AppEnvironment['nodeEnv'],
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  redisUrl: process.env.REDIS_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
});
