import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a tabela `deliveries` (paradas de rota).
 *
 * A localização é armazenada como `geometry(Point, 4326)` com índice espacial
 * GiST. A ordem da entrega é única por rota (`route_id`, `order`) e a FK para
 * `routes` usa `ON DELETE CASCADE` (a entrega pertence à rota).
 */
export class CriaEntregas1789934198439 implements MigrationInterface {
  name = 'CriaEntregas1789934198439';

  /**
   * Cria a tabela `deliveries`, o índice GiST, a unicidade e a FK.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "route_id" uuid NOT NULL,
        "order" integer NOT NULL,
        "geolocation" geometry(Point, 4326) NOT NULL,
        "address" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "delivered_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_deliveries_route_order" UNIQUE ("route_id", "order"),
        CONSTRAINT "PK_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_deliveries_route_id" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_deliveries_geolocation" ON "deliveries" USING GiST ("geolocation")`,
    );
  }

  /**
   * Remove a tabela `deliveries` e a FK associada.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deliveries" DROP CONSTRAINT "FK_deliveries_route_id"`);
    await queryRunner.query(`DROP INDEX "IDX_deliveries_geolocation"`);
    await queryRunner.query(`DROP TABLE "deliveries"`);
  }
}
