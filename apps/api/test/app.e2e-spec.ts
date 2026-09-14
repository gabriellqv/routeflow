import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) do bootstrap da API.
 *
 * Validam que a aplicação sobe com as configurações globais aplicadas e que o
 * endpoint de health check responde corretamente. Requerem PostgreSQL e Redis
 * em execução (ver `docker-compose.yml`).
 */
describe('Bootstrap da API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health deve retornar 200 com as dependências saudáveis', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    });
  });

  it('GET /api/docs deve expor a documentação Swagger', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
