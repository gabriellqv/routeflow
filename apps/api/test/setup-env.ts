/**
 * Configuração de ambiente para a execução dos testes.
 *
 * Define valores padrão para as variáveis obrigatórias da aplicação, evitando
 * que a validação do `ConfigModule` falhe em ambientes de teste (unitários e
 * e2e) que não dependem de serviços externos reais.
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??= 'postgres://routeflow:routeflow@localhost:5432/routeflow';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_SECRET ??= 'test-secret-with-enough-length';
