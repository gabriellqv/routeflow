import { RequestMethod, ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Aplica as configurações globais de rota, validação e documentação da API.
 *
 * Centraliza o setup executado no bootstrap, mantendo o `main.ts` enxuto e
 * permitindo reutilizar a mesma configuração nos testes e2e.
 *
 * @param app Instância da aplicação Nest já criada.
 */
export function setupApplication(app: INestApplication): void {
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RouteFlow API')
    .setDescription('API de logística/transporte com simulação em tempo real de veículos.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
