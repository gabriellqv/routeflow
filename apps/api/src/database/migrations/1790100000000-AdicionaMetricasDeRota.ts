import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona colunas de métricas reais (distância, duração), perfil e origem da geometria na tabela `routes`.
 */
export class AdicionaMetricasDeRota1790100000000 implements MigrationInterface {
  name = 'AdicionaMetricasDeRota1790100000000';

  /**
   * Adiciona as novas colunas à tabela `routes`.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN "distance_m" double precision`);
    await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN "duration_s" double precision`);
    await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN "profile" text`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD COLUMN "geometry_source" text NOT NULL DEFAULT 'manual'`,
    );
  }

  /**
   * Remove as colunas adicionadas da tabela `routes`.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "geometry_source"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "profile"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "duration_s"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "distance_m"`);
  }
}
