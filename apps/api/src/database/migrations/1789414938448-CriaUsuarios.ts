import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a tabela `users`, base para a autenticação da API.
 *
 * Utiliza `gen_random_uuid()` (nativo no PostgreSQL 13+) para gerar os
 * identificadores e garante a unicidade do e-mail.
 */
export class CriaUsuarios1789414938448 implements MigrationInterface {
  name = 'CriaUsuarios1789414938448';

  /**
   * Cria a tabela `users` e o índice único de e-mail.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "name" text NOT NULL,
        "password_hash" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
  }

  /**
   * Remove a tabela `users`.
   *
   * @param queryRunner Executor de queries da migration.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
