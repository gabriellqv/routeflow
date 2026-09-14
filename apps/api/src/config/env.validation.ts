import Joi from 'joi';

/**
 * Esquema de validação das variáveis de ambiente.
 *
 * A validação ocorre na inicialização da aplicação, garantindo que a API
 * falhe rápido (fail-fast) caso alguma variável obrigatória esteja ausente
 * ou inválida. Variáveis não listadas são permitidas, pois o ambiente de
 * execução contém inúmeras variáveis do sistema.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
});
