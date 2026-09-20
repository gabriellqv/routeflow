import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) de rotas.
 *
 * Cobrem o CRUD autenticado com geometria PostGIS e a atribuição 1—1 entre
 * rota e veículo.
 */
describe('Rotas (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

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
      'TRUNCATE TABLE "routes", "vehicles", "drivers", "users" RESTART IDENTITY CASCADE',
    );

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'rotas@routeflow.dev', name: 'Gestor de Rotas', password: 'senha-secreta' });

    token = register.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('deve exigir autenticação nas rotas', async () => {
    await request(app.getHttpServer()).get('/api/routes').expect(401);
  });

  it('deve criar, listar, atualizar e remover uma rota com geometria', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/routes')
      .set(auth())
      .send({ name: 'Centro — Zona Sul', geometry })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Centro — Zona Sul',
      geometry,
      waypoints: [],
      assigned_vehicle_id: null,
      status: 'created',
    });

    const list = await request(app.getHttpServer()).get('/api/routes').set(auth()).expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/routes/${created.body.id}`)
      .set(auth())
      .send({ status: 'assigned' })
      .expect(200);
    expect(updated.body.status).toBe('assigned');

    await request(app.getHttpServer())
      .delete(`/api/routes/${created.body.id}`)
      .set(auth())
      .expect(204);
    await request(app.getHttpServer()).get('/api/routes').set(auth()).expect(200).expect([]);
  });

  it('deve atribuir uma rota a um veículo', async () => {
    const vehicle = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(auth())
      .send({ plate: 'RTA1234', type: 'truck', model: 'Volvo FH', capacity_kg: 12000 })
      .expect(201);

    const route = await request(app.getHttpServer())
      .post('/api/routes')
      .set(auth())
      .send({ name: 'Rota Atribuída', geometry, assigned_vehicle_id: vehicle.body.id })
      .expect(201);

    expect(route.body.assigned_vehicle_id).toBe(vehicle.body.id);
  });

  it('deve rejeitar um veículo com duas rotas atribuídas', async () => {
    const vehicle = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(auth())
      .send({ plate: 'RTA1234', type: 'truck', model: 'Volvo FH', capacity_kg: 12000 })
      .expect(201);

    const payload = { name: 'Rota', geometry, assigned_vehicle_id: vehicle.body.id };

    await request(app.getHttpServer()).post('/api/routes').set(auth()).send(payload).expect(201);
    await request(app.getHttpServer()).post('/api/routes').set(auth()).send(payload).expect(409);
  });

  it('deve validar o corpo da requisição', async () => {
    await request(app.getHttpServer())
      .post('/api/routes')
      .set(auth())
      .send({ name: '', geometry: { type: 'Point', coordinates: [1, 2] } })
      .expect(400);
  });
});
