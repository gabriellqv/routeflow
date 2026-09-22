import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria as tabelas de histórico `vehicle_positions` e `event_log`.
 *
 * `vehicle_positions` guarda o histórico de posições (flush do Redis em lote),
 * com índice espacial GiST em `position` para consultas por região.
 * `event_log` guarda os eventos consumidos da stream `vehicles:events`.
 */
export class CriaHistoricoDePosicoesEEventos1790000000000 implements MigrationInterface {
  name = 'CriaHistoricoDePosicoesEEventos1790000000000';

  /**
   * Cria as tabelas, índices e FKs.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicle_positions" (
        "id" bigserial NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "position" geometry(Point, 4326) NOT NULL,
        "speed_kmh" numeric NOT NULL,
        "status" text NOT NULL,
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_vehicle_positions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vehicle_positions_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_positions_vehicle_id" ON "vehicle_positions" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_positions_recorded_at" ON "vehicle_positions" ("recorded_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_positions_position" ON "vehicle_positions" USING GIST ("position")`,
    );

    await queryRunner.query(`
      CREATE TABLE "event_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "type" text NOT NULL,
        "payload" jsonb NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_log_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_event_log_vehicle_id" ON "event_log" ("vehicle_id")`,
    );
  }

  /**
   * Remove as tabelas de histórico e as FKs associadas.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_log" DROP CONSTRAINT "FK_event_log_vehicle_id"`);
    await queryRunner.query(`DROP INDEX "IDX_event_log_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "event_log"`);

    await queryRunner.query(
      `ALTER TABLE "vehicle_positions" DROP CONSTRAINT "FK_vehicle_positions_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_vehicle_positions_position"`);
    await queryRunner.query(`DROP INDEX "IDX_vehicle_positions_recorded_at"`);
    await queryRunner.query(`DROP INDEX "IDX_vehicle_positions_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "vehicle_positions"`);
  }
}
