import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/setup-app.js';

/**
 * Testes de integração (e2e) de manutenções.
 *
 * Cobrem o CRUD autenticado e o ciclo de vida do status, incluindo o reflexo no
 * status do veículo (manutenção durante a execução, ocioso ao concluir).
 */
describe('Manutenções (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let vehicleId: string;

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
      'TRUNCATE TABLE "maintenances", "deliveries", "routes", "vehicles", "drivers", "users" RESTART IDENTITY CASCADE',
    );

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'manutencao@routeflow.dev', name: 'Gestor', password: 'senha-secreta' });

    token = register.body.accessToken;

    const vehicle = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set({ Authorization: `Bearer ${token}` })
      .send({ plate: 'MNT1234', type: 'truck', model: 'Volvo FH', capacity_kg: 12000 })
      .expect(201);

    vehicleId = vehicle.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('deve exigir autenticação nas rotas', async () => {
    await request(app.getHttpServer()).get('/api/maintenance').expect(401);
  });

  it('deve criar, listar, atualizar e remover uma manutenção', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/maintenance')
      .set(auth())
      .send({ vehicle_id: vehicleId, type: 'preventive', description: 'Troca de óleo' })
      .expect(201);

    expect(created.body).toMatchObject({
      vehicle_id: vehicleId,
      type: 'preventive',
      description: 'Troca de óleo',
      status: 'scheduled',
      started_at: null,
      finished_at: null,
    });

    const list = await request(app.getHttpServer())
      .get(`/api/maintenance?vehicle_id=${vehicleId}`)
      .set(auth())
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/maintenance/${created.body.id}`)
      .set(auth())
      .send({ description: 'Troca de óleo e filtro' })
      .expect(200);
    expect(updated.body.description).toBe('Troca de óleo e filtro');

    await request(app.getHttpServer())
      .delete(`/api/maintenance/${created.body.id}`)
      .set(auth())
      .expect(204);
    await request(app.getHttpServer()).get('/api/maintenance').set(auth()).expect(200).expect([]);
  });

  it('deve refletir o status do veículo no ciclo de vida da manutenção', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/maintenance')
      .set(auth())
      .send({ vehicle_id: vehicleId, type: 'corrective', description: 'Reparo no motor' })
      .expect(201);

    const started = await request(app.getHttpServer())
      .patch(`/api/maintenance/${created.body.id}`)
      .set(auth())
      .send({ status: 'in_progress' })
      .expect(200);
    expect(started.body.status).toBe('in_progress');
    expect(started.body.started_at).not.toBeNull();

    const vehicleDuring = await request(app.getHttpServer())
      .get(`/api/vehicles/${vehicleId}`)
      .set(auth())
      .expect(200);
    expect(vehicleDuring.body.status).toBe('maintenance');

    const done = await request(app.getHttpServer())
      .patch(`/api/maintenance/${created.body.id}`)
      .set(auth())
      .send({ status: 'done' })
      .expect(200);
    expect(done.body.status).toBe('done');
    expect(done.body.finished_at).not.toBeNull();

    const vehicleAfter = await request(app.getHttpServer())
      .get(`/api/vehicles/${vehicleId}`)
      .set(auth())
      .expect(200);
    expect(vehicleAfter.body.status).toBe('idle');
  });

  it('deve rejeitar manutenção em veículo inexistente', async () => {
    await request(app.getHttpServer())
      .post('/api/maintenance')
      .set(auth())
      .send({
        vehicle_id: '00000000-0000-0000-0000-000000000000',
        type: 'preventive',
        description: 'A',
      })
      .expect(404);
  });

  it('deve validar o corpo da requisição', async () => {
    await request(app.getHttpServer())
      .post('/api/maintenance')
      .set(auth())
      .send({ vehicle_id: vehicleId, type: 'invalid', description: '' })
      .expect(400);
  });
});
