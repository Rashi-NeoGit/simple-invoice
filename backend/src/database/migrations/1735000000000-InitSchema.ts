import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1735000000000 implements MigrationInterface {
  name = 'InitSchema1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "fullname" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "invoice_status_enum" AS ENUM ('Draft', 'Pending', 'Paid')`,
    );

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_number" varchar(100) NOT NULL,
        "invoice_reference" varchar(100),
        "invoice_date" date NOT NULL,
        "due_date" date NOT NULL,
        "currency" varchar(10) NOT NULL,
        "currency_symbol" varchar(10) NOT NULL,
        "description" varchar(500),
        "status" invoice_status_enum NOT NULL DEFAULT 'Draft',
        "invoice_sub_total" numeric(12,2) NOT NULL,
        "total_tax" numeric(12,2) NOT NULL,
        "total_discount" numeric(12,2) NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "total_paid" numeric(12,2) NOT NULL DEFAULT 0,
        "balance_amount" numeric(12,2) NOT NULL,
        "customer_fullname" varchar(255) NOT NULL,
        "customer_email" varchar(255) NOT NULL,
        "customer_mobile" varchar(50),
        "customer_address" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        CONSTRAINT "uq_invoices_invoice_number" UNIQUE ("invoice_number"),
        CONSTRAINT "chk_invoices_due_date_after_invoice_date" CHECK ("due_date" >= "invoice_date")
      )
    `);

    // Indexes on every column the spec requires sort/filter/search on (§4.1 "Database
    // Design: appropriate constraints and indexes") — invoice_number is already indexed
    // via its unique constraint above.
    await queryRunner.query(`CREATE INDEX "idx_invoices_status" ON "invoices" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "idx_invoices_invoice_date" ON "invoices" ("invoice_date")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_invoices_due_date" ON "invoices" ("due_date")`);
    await queryRunner.query(
      `CREATE INDEX "idx_invoices_total_amount" ON "invoices" ("total_amount")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_invoices_customer_fullname" ON "invoices" ("customer_fullname")`,
    );

    await queryRunner.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "quantity" integer NOT NULL,
        "rate" numeric(12,2) NOT NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items" ("invoice_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_customer_fullname"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_total_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_invoice_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
