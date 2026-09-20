import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a tabela `maintenances`.
 *
 * Cada manutenção pertence a um veículo (`vehicle_id`) com `ON DELETE CASCADE`
 * e registra o ciclo de vida do serviço (`scheduled` → `in_progress` → `done`).
 */
export class CriaManutencoes1789936093395 implements MigrationInterface {
  name = 'CriaManutencoes1789936093395';

  /**
   * Cria a tabela `maintenances`, o índice de veículo e a FK.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "maintenances" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "type" text NOT NULL,
        "description" text NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "status" text NOT NULL DEFAULT 'scheduled',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenances_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_maintenances_vehicle_id" ON "maintenances" ("vehicle_id")`,
    );
  }

  /**
   * Remove a tabela `maintenances` e a FK associada.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "maintenances" DROP CONSTRAINT "FK_maintenances_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_maintenances_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "maintenances"`);
  }
}
