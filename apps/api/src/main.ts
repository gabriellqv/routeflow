import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { AppEnvironment } from './config/app-environment.interface.js';
import { setupApplication } from './setup-app.js';

/**
 * Inicializa a aplicação HTTP da API.
 *
 * Habilita o encerramento gracioso (para fechar conexões de banco e Redis),
 * aplica cabeçalhos de segurança, configura CORS, as definições globais de
 * rota/validação/documentação e inicia a escuta na porta configurada.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors({ origin: true });

  setupApplication(app);

  const configService = app.get(ConfigService<AppEnvironment>);
  const port = configService.get('port', { infer: true }) ?? 3000;
  const nodeEnv = configService.get('nodeEnv', { infer: true }) ?? 'development';

  await app.listen(port);

  Logger.log(`API RouteFlow iniciada em http://localhost:${port} (${nodeEnv})`, 'Bootstrap');
  Logger.log(`Documentação Swagger em http://localhost:${port}/api/docs`, 'Bootstrap');
}

await bootstrap();
