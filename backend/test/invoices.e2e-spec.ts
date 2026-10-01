import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Invoice } from '../src/invoices/invoice.entity';
import { User } from '../src/users/user.entity';

/**
 * Real integration test: boots the actual Nest app against a real Postgres connection
 * (configured via the same DATABASE_* env vars as the app itself — point them at a
 * disposable test database before running `npm run test:e2e`), runs real migrations,
 * and exercises the full HTTP stack with supertest. No service/repository mocking —
 * this is the lesson learned from a prior submission whose "e2e" test fully mocked
 * the service and never touched a database.
 */
describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let invoiceRepo: Repository<Invoice>;
  let accessToken: string;

  const testRunId = Date.now();
  const testUserEmail = `e2e-test-${testRunId}@example.com`;
  const testUserPassword = 'TestPassword@123';
  const invoiceNumberPrefix = `IV-E2E-${testRunId}`;

  // Dates relative to "now" rather than hardcoded, so the suite isn't silently broken
  // by being run on a date after a hardcoded due date has passed.
  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();

    userRepo = app.get(getRepositoryToken(User));
    invoiceRepo = app.get(getRepositoryToken(Invoice));

    const passwordHash = await bcrypt.hash(testUserPassword, 10);
    await userRepo.save(
      userRepo.create({ email: testUserEmail, passwordHash, fullname: 'E2E Test User' }),
    );
  });

  afterAll(async () => {
    await invoiceRepo
      .createQueryBuilder()
      .delete()
      .where('invoice_number LIKE :prefix', { prefix: `${invoiceNumberPrefix}%` })
      .execute();
    await userRepo.delete({ email: testUserEmail });
    await app.close();
  });

  it('rejects /invoices without a token', async () => {
    await request(app.getHttpServer()).get('/invoices').expect(401);
  });

  it('logs in and returns a JWT + user profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserEmail, password: testUserPassword })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(testUserEmail);
    accessToken = response.body.accessToken;
  });

  it('rejects invalid login credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('full workflow: create an invoice, then see it in the list and its own detail view', async () => {
    const invoiceNumber = `${invoiceNumberPrefix}-001`;

    const createResponse = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customer: { fullname: 'E2E Customer', email: 'customer@example.com' },
        item: { name: 'Test Widget', quantity: 3, rate: 50 },
        invoiceNumber,
        invoiceDate: dateOffset(-5),
        dueDate: dateOffset(25),
        currency: 'USD',
        tax: 10,
        discount: 10,
      })
      .expect(201);

    // subTotal = 3*50=150, tax=15, total=150+15-10=155 — computed by the backend, not sent by the client.
    expect(createResponse.body.invoiceSubTotal).toBe(150);
    expect(createResponse.body.totalTax).toBe(15);
    expect(createResponse.body.totalAmount).toBe(155);
    expect(createResponse.body.balanceAmount).toBe(155);
    expect(createResponse.body.status).toBe('Draft');
    expect(createResponse.body.customer).toMatchObject({
      fullname: 'E2E Customer',
      email: 'customer@example.com',
    });
    expect(createResponse.body.items).toHaveLength(1);

    const invoiceId = createResponse.body.invoiceId;

    const listResponse = await request(app.getHttpServer())
      .get('/invoices')
      .query({ keyword: invoiceNumber })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.paging.total).toBe(1);
    expect(listResponse.body.data[0].invoiceNumber).toBe(invoiceNumber);

    const detailResponse = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body.invoiceNumber).toBe(invoiceNumber);
    expect(detailResponse.body.totalAmount).toBe(155);
  });

  it('rejects a duplicate invoice number with 409', async () => {
    const invoiceNumber = `${invoiceNumberPrefix}-002`;
    const payload = {
      customer: { fullname: 'Dup Customer', email: 'dup@example.com' },
      item: { name: 'Widget', quantity: 1, rate: 100 },
      invoiceNumber,
      invoiceDate: dateOffset(0),
      dueDate: dateOffset(14),
      currency: 'AUD',
    };

    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(409);
  });

  it('rejects a due date before the invoice date with a structured 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customer: { fullname: 'Bad Date Customer', email: 'baddate@example.com' },
        item: { name: 'Widget', quantity: 1, rate: 100 },
        invoiceNumber: `${invoiceNumberPrefix}-003`,
        invoiceDate: '2026-06-10',
        dueDate: '2026-06-01',
        currency: 'AUD',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('dueDate must be on or after invoiceDate')]),
    );
  });

  it('derives Overdue at read time for a non-Paid invoice whose due date has passed, and excludes it from Draft', async () => {
    const invoiceNumber = `${invoiceNumberPrefix}-overdue`;

    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customer: { fullname: 'Overdue Customer', email: 'overdue@example.com' },
        item: { name: 'Widget', quantity: 1, rate: 100 },
        invoiceNumber,
        invoiceDate: '2020-01-01',
        dueDate: '2020-01-15', // long past -> overdue, since newly-created invoices are always Draft (never Paid)
        currency: 'AUD',
      })
      .expect(201);

    const overdueList = await request(app.getHttpServer())
      .get('/invoices')
      .query({ status: 'Overdue', keyword: invoiceNumber })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      overdueList.body.data.map((inv: { invoiceNumber: string }) => inv.invoiceNumber),
    ).toContain(invoiceNumber);

    const draftList = await request(app.getHttpServer())
      .get('/invoices')
      .query({ status: 'Draft', keyword: invoiceNumber })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      draftList.body.data.map((inv: { invoiceNumber: string }) => inv.invoiceNumber),
    ).not.toContain(invoiceNumber);
  });

  it('returns a 404 in the spec-documented shape for a non-existent invoice', async () => {
    const response = await request(app.getHttpServer())
      .get('/invoices/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Invoice not found',
      error: 'Not Found',
    });
  });
});
