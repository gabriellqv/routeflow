import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita a extensão PostGIS e cria a tabela `routes`.
 *
 * O traçado da rota é armazenado como `geometry(LineString, 4326)` com índice
 * espacial GiST para consultas de proximidade/desvio. `assigned_vehicle_id` é
 * único e referencia `vehicles` com `ON DELETE SET NULL`, garantindo a
 * atribuição 1—1 (um veículo recebe no máximo uma rota).
 */
export class CriaRotasComPostgis1789930704007 implements MigrationInterface {
  name = 'CriaRotasComPostgis1789930704007';

  /**
   * Habilita o PostGIS e cria a tabela `routes`, o índice GiST e a FK.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "geometry" geometry(LineString, 4326) NOT NULL,
        "waypoints" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "assigned_vehicle_id" uuid,
        "status" text NOT NULL DEFAULT 'created',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_routes_assigned_vehicle_id" UNIQUE ("assigned_vehicle_id"),
        CONSTRAINT "PK_routes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_routes_assigned_vehicle_id" FOREIGN KEY ("assigned_vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_routes_geometry" ON "routes" USING GiST ("geometry")`,
    );
  }

  /**
   * Remove a tabela `routes` e a FK associada.
   *
   * A extensão PostGIS é mantida, pois pode ser usada por outras tabelas.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_assigned_vehicle_id"`);
    await queryRunner.query(`DROP INDEX "IDX_routes_geometry"`);
    await queryRunner.query(`DROP TABLE "routes"`);
  }
}
