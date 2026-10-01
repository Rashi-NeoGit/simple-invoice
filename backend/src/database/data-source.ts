import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';
import { InvoiceItem } from '../invoices/invoice-item.entity';

dotenv.config();

/**
 * Used by the TypeORM CLI (migration:generate/run/revert) and by the seed script —
 * both run outside Nest's DI container, so they need a plain DataSource.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Invoice, InvoiceItem],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
