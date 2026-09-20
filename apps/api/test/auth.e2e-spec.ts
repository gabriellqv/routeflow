import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) da autenticação.
 *
 * Exercitam o fluxo real de cadastro, login e acesso a rota protegida,
 * usando PostgreSQL e Redis em execução. A tabela `users` é limpa antes de
 * cada teste para garantir isolamento.
 */
describe('Autenticação (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  const credentials = {
    email: 'auth@routeflow.dev',
    name: 'Usuário Teste',
    password: 'senha-secreta',
  };

  it('POST /api/auth/register deve criar o usuário e retornar um token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('POST /api/auth/register deve rejeitar e-mail duplicado com 409', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);

    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(409);
  });

  it('POST /api/auth/login deve retornar 401 para senha inválida', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'senha-errada' })
      .expect(401);
  });

  it('GET /api/auth/me deve retornar o usuário autenticado com token válido', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ id: expect.any(String), email: credentials.email });
  });

  it('GET /api/auth/me deve retornar 401 sem token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
