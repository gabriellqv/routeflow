import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) de veículos e motoristas.
 *
 * Cobrem o CRUD autenticado e a relação 1—1 entre motorista e veículo. A
 * autenticação é obtida cadastrando um usuário e usando o token retornado.
 */
describe('Veículos e Motoristas (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

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
      'TRUNCATE TABLE "vehicles", "drivers", "users" RESTART IDENTITY CASCADE',
    );

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'frota@routeflow.dev', name: 'Gestor de Frota', password: 'senha-secreta' });

    token = register.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('deve exigir autenticação nas rotas de veículos', async () => {
    await request(app.getHttpServer()).get('/api/vehicles').expect(401);
  });

  it('deve criar, listar, atualizar e remover um veículo', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(auth())
      .send({ plate: 'ABC1234', type: 'truck', model: 'Volvo FH', capacity_kg: 12000 })
      .expect(201);

    expect(created.body).toMatchObject({
      plate: 'ABC1234',
      type: 'truck',
      status: 'idle',
      driver_id: null,
    });

    const list = await request(app.getHttpServer()).get('/api/vehicles').set(auth()).expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/vehicles/${created.body.id}`)
      .set(auth())
      .send({ status: 'maintenance' })
      .expect(200);
    expect(updated.body.status).toBe('maintenance');

    await request(app.getHttpServer())
      .delete(`/api/vehicles/${created.body.id}`)
      .set(auth())
      .expect(204);
    await request(app.getHttpServer()).get('/api/vehicles').set(auth()).expect(200).expect([]);
  });

  it('deve rejeitar veículo com placa duplicada', async () => {
    const payload = { plate: 'ABC1234', type: 'van', model: 'Sprinter', capacity_kg: 1500 };

    await request(app.getHttpServer()).post('/api/vehicles').set(auth()).send(payload).expect(201);
    await request(app.getHttpServer()).post('/api/vehicles').set(auth()).send(payload).expect(409);
  });

  it('deve criar um motorista associado a um veículo', async () => {
    const vehicle = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(auth())
      .send({ plate: 'XYZ9876', type: 'van', model: 'Sprinter', capacity_kg: 1500 })
      .expect(201);

    const driver = await request(app.getHttpServer())
      .post('/api/drivers')
      .set(auth())
      .send({
        name: 'João da Silva',
        license_number: '12345678900',
        license_category: 'D',
        vehicle_id: vehicle.body.id,
      })
      .expect(201);

    expect(driver.body.vehicle_id).toBe(vehicle.body.id);

    const vehicleAfter = await request(app.getHttpServer())
      .get(`/api/vehicles/${vehicle.body.id}`)
      .set(auth())
      .expect(200);
    expect(vehicleAfter.body.driver_id).toBe(driver.body.id);
  });

  it('deve validar o corpo da requisição', async () => {
    await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(auth())
      .send({ plate: 'AB', type: 'invalid', model: '', capacity_kg: -1 })
      .expect(400);
  });
});
