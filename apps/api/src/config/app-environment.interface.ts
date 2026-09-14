/**
 * Contrato de tipagem da configuração da aplicação.
 *
 * Centraliza os nomes das chaves de configuração utilizadas em toda a API,
 * evitando o uso de strings soltas ao recuperar valores do `ConfigService`.
 */
export interface AppEnvironment {
  /** Ambiente de execução (`development`, `test` ou `production`). */
  nodeEnv: 'development' | 'test' | 'production';

  /** Porta HTTP em que a API escuta. */
  port: number;

  /** String de conexão do PostgreSQL (com extensão PostGIS). */
  databaseUrl: string;

  /** String de conexão do Redis (estado rápido, pub/sub e streams). */
  redisUrl: string;

  /** Segredo utilizado para assinar os tokens JWT. */
  jwtSecret: string;
}
