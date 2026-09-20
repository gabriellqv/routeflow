import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) de entregas.
 *
 * Cobrem o CRUD autenticado com geolocalização PostGIS, a unicidade da ordem
 * por rota e a conclusão da entrega.
 */
describe('Entregas (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let routeId: string;

  const geometry = {
    type: 'LineString',
    coordinates: [
      [-46.6333, -23.5505],
      [-46.65, -23.6],
    ],
  };

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
    await dataSource.query(
      'TRUNCATE TABLE "deliveries", "routes", "vehicles", "drivers", "users" RESTART IDENTITY CASCADE',
    );

    const register = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'entregas@routeflow.dev',
      name: 'Gestor de Entregas',
      password: 'senha-secreta',
    });

    token = register.body.accessToken;

    const route = await request(app.getHttpServer())
      .post('/api/routes')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Rota de Entregas', geometry })
      .expect(201);

    routeId = route.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('deve exigir autenticação nas rotas', async () => {
    await request(app.getHttpServer()).get('/api/deliveries').expect(401);
  });

  it('deve criar, listar, atualizar e remover uma entrega', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/deliveries')
      .set(auth())
      .send({
        route_id: routeId,
        order: 1,
        geolocation: { type: 'Point', coordinates: [-46.6333, -23.5505] },
        address: 'Av. Paulista, 1000',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      route_id: routeId,
      order: 1,
      address: 'Av. Paulista, 1000',
      status: 'pending',
      delivered_at: null,
    });

    const list = await request(app.getHttpServer())
      .get(`/api/deliveries?route_id=${routeId}`)
      .set(auth())
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/deliveries/${created.body.id}`)
      .set(auth())
      .send({ status: 'done' })
      .expect(200);
    expect(updated.body.status).toBe('done');
    expect(updated.body.delivered_at).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/api/deliveries/${created.body.id}`)
      .set(auth())
      .expect(204);
    await request(app.getHttpServer()).get('/api/deliveries').set(auth()).expect(200).expect([]);
  });

  it('deve rejeitar duas entregas na mesma ordem da rota', async () => {
    const payload = {
      route_id: routeId,
      order: 1,
      geolocation: { type: 'Point', coordinates: [-46.6333, -23.5505] },
      address: 'Av. Paulista, 1000',
    };

    await request(app.getHttpServer())
      .post('/api/deliveries')
      .set(auth())
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/deliveries')
      .set(auth())
      .send(payload)
      .expect(409);
  });

  it('deve rejeitar entrega em rota inexistente', async () => {
    await request(app.getHttpServer())
      .post('/api/deliveries')
      .set(auth())
      .send({
        route_id: '00000000-0000-0000-0000-000000000000',
        order: 1,
        geolocation: { type: 'Point', coordinates: [-46.6333, -23.5505] },
        address: 'Av. Paulista, 1000',
      })
      .expect(404);
  });

  it('deve validar o corpo da requisição', async () => {
    await request(app.getHttpServer())
      .post('/api/deliveries')
      .set(auth())
      .send({
        route_id: routeId,
        order: -1,
        geolocation: {
          type: 'LineString',
          coordinates: [
            [1, 2],
            [3, 4],
          ],
        },
        address: '',
      })
      .expect(400);
  });
});
