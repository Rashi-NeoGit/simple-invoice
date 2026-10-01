import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoicesService } from './invoices.service';

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildDto(overrides: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto {
  return {
    customer: { fullname: 'Paul Tan', email: 'paul@example.com' },
    item: { name: 'Widget', quantity: 2, rate: 100 },
    invoiceNumber: 'IV-TEST-001',
    invoiceDate: addDays(0),
    dueDate: addDays(30),
    currency: 'AUD',
    ...overrides,
  } as CreateInvoiceDto;
}

describe('InvoicesService.create', () => {
  it('throws ConflictException (409) when the DB reports a unique-violation on invoiceNumber', async () => {
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const service = new InvoicesService(repo as any, {} as any);

    await expect(service.create(buildDto(), 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unrelated errors unchanged', async () => {
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockRejectedValue(new Error('connection lost')),
    };
    const service = new InvoicesService(repo as any, {} as any);

    await expect(service.create(buildDto(), 'user-1')).rejects.toThrow('connection lost');
  });

  it('computes totals server-side, defaulting tax to 10% and discount to 0 when omitted', async () => {
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ ...entity, id: 'generated-id', createdAt: new Date() })),
    };
    const service = new InvoicesService(repo as any, {} as any);

    const result = await service.create(buildDto(), 'user-1');

    // subTotal = 2*100 = 200; tax defaults to 10% = 20; discount defaults to 0 -> total 220
    expect(result.invoiceSubTotal).toBe(200);
    expect(result.totalTax).toBe(20);
    expect(result.totalDiscount).toBe(0);
    expect(result.totalAmount).toBe(220);
    expect(result.balanceAmount).toBe(220);
    expect(result.status).toBe(InvoiceStatus.DRAFT);
    expect(result.items[0]).toMatchObject({ name: 'Widget', quantity: 2, rate: 100 });
  });

  it('always creates new invoices with status Draft, regardless of input', async () => {
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ ...entity, id: 'generated-id', createdAt: new Date() })),
    };
    const service = new InvoicesService(repo as any, {} as any);

    const result = await service.create(buildDto(), 'user-1');
    expect(result.status).toBe(InvoiceStatus.DRAFT);
  });
});

function buildDraftInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    invoiceNumber: 'IV-EXISTING-001',
    invoiceDate: addDays(0),
    dueDate: addDays(30),
    currency: 'AUD',
    currencySymbol: 'AU$',
    status: InvoiceStatus.DRAFT,
    invoiceSubTotal: 100,
    totalTax: 10,
    totalDiscount: 0,
    totalAmount: 110,
    totalPaid: 0,
    balanceAmount: 110,
    customerFullname: 'Old Customer',
    customerEmail: 'old@example.com',
    createdAt: new Date(),
    createdBy: 'user-1',
    items: [{ id: 'item-1', invoiceId: 'invoice-1', name: 'Old Item', quantity: 1, rate: 100 }],
    ...overrides,
  } as Invoice;
}

describe('InvoicesService.update', () => {
  it('throws NotFoundException when the invoice does not exist', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new InvoicesService(repo as any, {} as any);

    await expect(service.update('missing-id', buildDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException (409) when the invoice is not Draft', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(buildDraftInvoice({ status: InvoiceStatus.PAID })),
    };
    const service = new InvoicesService(repo as any, {} as any);

    await expect(service.update('invoice-1', buildDto())).rejects.toBeInstanceOf(ConflictException);
  });

  it('recomputes totals and overwrites customer/item/invoice fields for a Draft invoice', async () => {
    const existing = buildDraftInvoice();
    const repo = {
      findOne: jest.fn().mockResolvedValue(existing),
      save: jest.fn(async (entity) => entity),
    };
    const service = new InvoicesService(repo as any, {} as any);

    const result = await service.update(
      'invoice-1',
      buildDto({
        customer: { fullname: 'New Customer', email: 'new@example.com' },
        item: { name: 'New Item', quantity: 3, rate: 50 },
        invoiceNumber: 'IV-UPDATED-001',
        tax: 20,
        discount: 5,
      }),
    );

    // subTotal = 3*50=150, tax 20% = 30, discount 5 -> total 175
    expect(result.invoiceNumber).toBe('IV-UPDATED-001');
    expect(result.invoiceSubTotal).toBe(150);
    expect(result.totalTax).toBe(30);
    expect(result.totalDiscount).toBe(5);
    expect(result.totalAmount).toBe(175);
    expect(result.balanceAmount).toBe(175);
    expect(result.customer).toMatchObject({ fullname: 'New Customer', email: 'new@example.com' });
    expect(result.items[0]).toMatchObject({ name: 'New Item', quantity: 3, rate: 50 });
    expect(result.status).toBe(InvoiceStatus.DRAFT);
  });

  it('throws ConflictException (409) when the new invoice number collides with another invoice', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(buildDraftInvoice()),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const service = new InvoicesService(repo as any, {} as any);

    await expect(service.update('invoice-1', buildDto())).rejects.toBeInstanceOf(ConflictException);
  });
});

function buildQueryBuilderMock(rows: Invoice[], total: number) {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    // Deliberately no leftJoinAndSelect here: if findAll() is ever changed to join
    // `items` back into this paginated query builder, it will call a method that
    // doesn't exist on this mock and this test will fail with a TypeError — a
    // regression guard against reintroducing the one-to-many + skip/take pagination
    // bug this fix addresses (LIMIT/OFFSET on a joined query applies to the
    // post-join row set, not distinct invoices).
  };
}

describe('InvoicesService.findAll', () => {
  it('paginates invoices without joining items, then stitches multiple items per invoice from a separate query', async () => {
    const invoiceA = buildDraftInvoice({ id: 'invoice-a', items: [] });
    const invoiceB = buildDraftInvoice({ id: 'invoice-b', items: [] });
    const qb = buildQueryBuilderMock([invoiceA, invoiceB], 2);

    const invoiceRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const itemRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'item-a1', invoiceId: 'invoice-a', name: 'A1', quantity: 1, rate: 10 },
        { id: 'item-a2', invoiceId: 'invoice-a', name: 'A2', quantity: 2, rate: 20 },
        { id: 'item-b1', invoiceId: 'invoice-b', name: 'B1', quantity: 1, rate: 5 },
      ]),
    };

    const service = new InvoicesService(invoiceRepo as any, itemRepo as any);
    const result = await service.findAll({ page: 1, pageSize: 10 } as any);

    expect(result.data.find((inv) => inv.invoiceId === 'invoice-a')?.items).toHaveLength(2);
    expect(result.data.find((inv) => inv.invoiceId === 'invoice-b')?.items).toHaveLength(1);
    expect(result.paging).toEqual({ page: 1, pageSize: 10, total: 2 });
  });

  it('does not query items at all when the page has no rows', async () => {
    const qb = buildQueryBuilderMock([], 0);
    const invoiceRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const itemRepo = { find: jest.fn() };

    const service = new InvoicesService(invoiceRepo as any, itemRepo as any);
    const result = await service.findAll({ page: 1, pageSize: 10 } as any);

    expect(itemRepo.find).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
  });

  it('imposes no default business sort — only a stable id tiebreaker — when sortBy is omitted', async () => {
    const qb = buildQueryBuilderMock([], 0);
    const invoiceRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const itemRepo = { find: jest.fn() };

    const service = new InvoicesService(invoiceRepo as any, itemRepo as any);
    await service.findAll({ page: 1, pageSize: 10 } as any);

    // No business column (invoiceDate/dueDate/totalAmount) is ever set as the primary
    // order when the caller doesn't ask for one — only the deterministic-pagination
    // tiebreaker on id.
    expect(qb.orderBy).not.toHaveBeenCalled();
    expect(qb.addOrderBy).toHaveBeenCalledWith('invoice.id', 'ASC');
  });

  it('still applies the stable id tiebreaker alongside an explicit sort, so ties paginate deterministically', async () => {
    const qb = buildQueryBuilderMock([], 0);
    const invoiceRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const itemRepo = { find: jest.fn() };

    const service = new InvoicesService(invoiceRepo as any, itemRepo as any);
    await service.findAll({
      page: 1,
      pageSize: 10,
      sortBy: 'totalAmount',
      ordering: 'DESC',
    } as any);

    expect(qb.orderBy).toHaveBeenCalledWith('invoice.totalAmount', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('invoice.id', 'ASC');
  });
});
