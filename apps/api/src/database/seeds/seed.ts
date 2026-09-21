import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { DeliveryStatus, RouteStatus, VehicleStatus, VehicleType } from '@routeflow/contracts';
import { envValidationSchema } from '../../config/env.validation.js';

loadEnv({ path: ['../../.env', '.env'], quiet: true });

/** Credenciais do usuário administrador de demonstração. */
const adminUser = {
  email: 'admin@routeflow.com',
  name: 'Administrador',
  password: 'admin123',
} as const;

/** Custo do bcrypt, alinhado ao `AuthService`. */
const BCRYPT_ROUNDS = 12;

/**
 * Resolve a URL do banco a partir das variáveis de ambiente validadas.
 *
 * O seed roda fora do contexto do Nest, então a validação é aplicada
 * manualmente para manter o mesmo comportamento de fail-fast.
 *
 * @returns URL de conexão do PostgreSQL.
 */
function resolveDatabaseUrl(): string {
  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Configuração de ambiente inválida: ${error.message}`);
  }

  return value.DATABASE_URL as string;
}

/** Rota de exemplo com traçado e paradas (entrega) em São Paulo. */
interface SeedRoute {
  name: string;
  plate: string;
  vehicleModel: string;
  coordinates: [number, number][];
  stops: { order: number; coordinates: [number, number]; address: string }[];
}

const routes: SeedRoute[] = [
  {
    name: 'Centro — Zona Sul',
    plate: 'SEED001',
    vehicleModel: 'Volvo FH',
    coordinates: [
      [-46.6333, -23.5505],
      [-46.638, -23.56],
      [-46.645, -23.575],
      [-46.652, -23.59],
      [-46.66, -23.605],
    ],
    stops: [
      { order: 1, coordinates: [-46.638, -23.56], address: 'Av. Paulista, 1000' },
      { order: 2, coordinates: [-46.652, -23.59], address: 'Av. Ibirapuera, 2000' },
      { order: 3, coordinates: [-46.66, -23.605], address: 'Av. Interlagos, 500' },
    ],
  },
  {
    name: 'Zona Oeste — Centro',
    plate: 'SEED002',
    vehicleModel: 'Mercedes Sprinter',
    coordinates: [
      [-46.72, -23.54],
      [-46.7, -23.545],
      [-46.68, -23.548],
      [-46.65, -23.55],
      [-46.6333, -23.5505],
    ],
    stops: [
      { order: 1, coordinates: [-46.7, -23.545], address: 'Rua dos Pinheiros, 300' },
      { order: 2, coordinates: [-46.65, -23.55], address: 'Av. Angélica, 1500' },
    ],
  },
];

/**
 * Popula o banco com veículos, rotas e entregas de demonstração.
 *
 * É idempotente por placa: veículos com a mesma placa são removidos (com suas
 * rotas/entregas em cascata) e recriados. Também garante o usuário
 * administrador de demonstração (`admin@routeflow.com`). Ao final, imprime um
 * resumo.
 */
async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: resolveDatabaseUrl(),
    uuidExtension: 'pgcrypto',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    await ensureAdminUser(dataSource);

    for (const route of routes) {
      const [existing] = await dataSource.query<{ id: string }[]>(
        'SELECT "id" FROM "vehicles" WHERE "plate" = $1',
        [route.plate],
      );

      if (existing) {
        await dataSource.query('DELETE FROM "vehicles" WHERE "id" = $1', [existing.id]);
      }

      const [vehicle] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO "vehicles" ("plate", "type", "model", "capacity_kg", "status")
         VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
        [route.plate, VehicleType.Truck, route.vehicleModel, 12000, VehicleStatus.Idle],
      );

      const lineString = `LINESTRING(${route.coordinates
        .map(([lng, lat]) => `${lng} ${lat}`)
        .join(', ')})`;

      const [createdRoute] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO "routes" ("name", "geometry", "waypoints", "assigned_vehicle_id", "status")
         VALUES ($1, ST_SetSRID(ST_GeomFromText($2), 4326), $3::jsonb, $4, $5)
         RETURNING "id"`,
        [
          route.name,
          lineString,
          JSON.stringify(
            route.stops.map((stop) => ({ lng: stop.coordinates[0], lat: stop.coordinates[1] })),
          ),
          vehicle.id,
          RouteStatus.Assigned,
        ],
      );

      for (const stop of route.stops) {
        await dataSource.query(
          `INSERT INTO "deliveries" ("route_id", "order", "geolocation", "address", "status")
           VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6)`,
          [
            createdRoute.id,
            stop.order,
            stop.coordinates[0],
            stop.coordinates[1],
            stop.address,
            DeliveryStatus.Pending,
          ],
        );
      }

      console.log(
        `Seed: rota "${route.name}" (veículo ${route.plate}) com ${route.stops.length} entrega(s).`,
      );
    }

    console.log(`Seed concluído: ${routes.length} rota(s) de demonstração.`);
  } finally {
    await dataSource.destroy();
  }
}

/**
 * Garante o usuário administrador de demonstração.
 *
 * Cria o usuário quando não existe; se já existir, apenas atualiza o nome e o
 * hash da senha, mantendo as credenciais conhecidas.
 *
 * @param dataSource Conexão ativa com o banco.
 */
async function ensureAdminUser(dataSource: DataSource): Promise<void> {
  const passwordHash = await bcrypt.hash(adminUser.password, BCRYPT_ROUNDS);

  await dataSource.query(
    `INSERT INTO "users" ("email", "name", "password_hash")
     VALUES ($1, $2, $3)
     ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name",
       "password_hash" = EXCLUDED."password_hash"`,
    [adminUser.email, adminUser.name, passwordHash],
  );

  console.log(`Seed: usuário administrador "${adminUser.email}" pronto.`);
}

seed().catch((error) => {
  console.error('Falha ao executar o seed:', error);
  process.exitCode = 1;
});
