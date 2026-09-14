import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria as tabelas `drivers` e `vehicles` e a relação 1—1 entre elas.
 *
 * `vehicles.driver_id` é único e referencia `drivers` com `ON DELETE SET NULL`,
 * garantindo que um motorista esteja associado a no máximo um veículo e que a
 * remoção de um motorista apenas desassocie o veículo.
 */
export class CriaVeiculosEMotoristas1789417259642 implements MigrationInterface {
  name = 'CriaVeiculosEMotoristas1789417259642';

  /**
   * Cria as tabelas `drivers` e `vehicles` com seus índices e a chave estrangeira.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "license_number" text NOT NULL,
        "license_category" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_drivers_license_number" UNIQUE ("license_number"),
        CONSTRAINT "PK_drivers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "plate" text NOT NULL,
        "type" text NOT NULL,
        "model" text NOT NULL,
        "capacity_kg" numeric NOT NULL,
        "status" text NOT NULL DEFAULT 'idle',
        "driver_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vehicles_plate" UNIQUE ("plate"),
        CONSTRAINT "UQ_vehicles_driver_id" UNIQUE ("driver_id"),
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vehicles_driver_id" FOREIGN KEY ("driver_id")
          REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
  }

  /**
   * Remove as tabelas `vehicles` e `drivers` e a chave estrangeira associada.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "FK_vehicles_driver_id"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
  }
}
