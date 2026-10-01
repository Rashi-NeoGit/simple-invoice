import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { getCurrencySymbol } from '../common/currency';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatusFilter, ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { InvoiceItem } from './invoice-item.entity';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { calculateBalance, calculateInvoiceTotals } from './invoices.calculations';
import { InvoiceResponse, toInvoiceResponse } from './invoices.mapper';

export interface PaginatedInvoices {
  data: InvoiceResponse[];
  paging: { page: number; pageSize: number; total: number };
}

const DEFAULT_TAX_PERCENT = 10;
const DEFAULT_DISCOUNT = 0;

const SORT_COLUMN_MAP: Record<string, string> = {
  invoiceDate: 'invoice.invoiceDate',
  dueDate: 'invoice.dueDate',
  totalAmount: 'invoice.totalAmount',
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepository: Repository<InvoiceItem>,
  ) {}

  async create(dto: CreateInvoiceDto, userId: string): Promise<InvoiceResponse> {
    const tax = dto.tax ?? DEFAULT_TAX_PERCENT;
    const discount = dto.discount ?? DEFAULT_DISCOUNT;
    const { subTotal, taxAmount, totalAmount } = calculateInvoiceTotals(
      dto.item.quantity,
      dto.item.rate,
      tax,
      discount,
    );

    const invoiceItem = new InvoiceItem();
    invoiceItem.name = dto.item.name;
    invoiceItem.quantity = dto.item.quantity;
    invoiceItem.rate = dto.item.rate;

    const invoice = this.invoiceRepository.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceReference: dto.invoiceReference,
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      currency: dto.currency,
      currencySymbol: getCurrencySymbol(dto.currency),
      description: dto.description,
      invoiceSubTotal: subTotal,
      totalTax: taxAmount,
      totalDiscount: discount,
      totalAmount,
      balanceAmount: calculateBalance(totalAmount, 0),
      customerFullname: dto.customer.fullname,
      customerEmail: dto.customer.email,
      customerMobile: dto.customer.mobileNumber,
      customerAddress: dto.customer.address,
      status: InvoiceStatus.DRAFT,
      totalPaid: 0,
      createdBy: userId,
      items: [invoiceItem],
    });

    try {
      const saved = await this.invoiceRepository.save(invoice);
      return toInvoiceResponse(saved);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Invoice number must be unique');
      }
      throw error;
    }
  }

  /**
   * Deliberately does NOT join `items` into this query. LIMIT/OFFSET on a query
   * builder that joins a one-to-many relation applies to the post-join row set, not
   * distinct invoices — once any invoice has more than one item, that silently
   * corrupts pagination (and truncates which items hydrate onto which invoice).
   * It's unreachable today (every invoice always has exactly one item), but the
   * schema is explicitly built to support more in future, so this is fetched
   * correctly from the start: paginate invoices alone, then fetch items for just
   * that page's invoice IDs in a second query and stitch them on by invoiceId.
   */
  async findAll(query: ListInvoicesQueryDto): Promise<PaginatedInvoices> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const qb = this.invoiceRepository.createQueryBuilder('invoice');

    if (query.keyword) {
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :keyword OR invoice.customerFullname ILIKE :keyword)',
        {
          keyword: `%${query.keyword}%`,
        },
      );
    }

    if (query.fromDate) {
      qb.andWhere('invoice.invoiceDate >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('invoice.invoiceDate <= :toDate', { toDate: query.toDate });
    }

    this.applyStatusFilter(qb, query.status);

    // No default business sort — the spec only requires that invoiceDate/dueDate/
    // totalAmount be sortable when the caller asks for one, not that the list have
    // any particular order before they do. `invoice.id` is added as a stable
    // tiebreaker (always, and as the sole order when no sortBy is given) purely so
    // LIMIT/OFFSET pagination is deterministic — Postgres makes no ordering guarantee
    // at all without an ORDER BY, which would make paginated results unstable across
    // requests. This is a correctness safeguard, not a sort preference.
    if (query.sortBy) {
      qb.orderBy(SORT_COLUMN_MAP[query.sortBy], query.ordering ?? 'ASC');
    }
    qb.addOrderBy('invoice.id', 'ASC');

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();

    if (rows.length > 0) {
      const itemsByInvoiceId = await this.loadItemsByInvoiceId(rows.map((row) => row.id));
      for (const row of rows) {
        row.items = itemsByInvoiceId.get(row.id) ?? [];
      }
    }

    return {
      data: rows.map(toInvoiceResponse),
      paging: { page, pageSize, total },
    };
  }

  private async loadItemsByInvoiceId(invoiceIds: string[]): Promise<Map<string, InvoiceItem[]>> {
    const items = await this.invoiceItemRepository.find({ where: { invoiceId: In(invoiceIds) } });
    const byInvoiceId = new Map<string, InvoiceItem[]>();
    for (const item of items) {
      const existing = byInvoiceId.get(item.invoiceId);
      if (existing) {
        existing.push(item);
      } else {
        byInvoiceId.set(item.invoiceId, [item]);
      }
    }
    return byInvoiceId;
  }

  async findOne(id: string): Promise<InvoiceResponse> {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: ['items'] });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return toInvoiceResponse(invoice);
  }

  /**
   * Overdue is never a stored column value, so filtering by it can't be a literal
   * `WHERE status = 'Overdue'`. See the plan's "Important subtlety" note — this is the
   * one place that logic lives, and it has a dedicated unit test.
   */
  private applyStatusFilter(
    qb: SelectQueryBuilder<Invoice>,
    status: InvoiceStatusFilter | undefined,
  ): void {
    if (!status) {
      return;
    }

    if (status === InvoiceStatusFilter.OVERDUE) {
      qb.andWhere('invoice.status != :paidStatus', { paidStatus: InvoiceStatus.PAID }).andWhere(
        'invoice.dueDate < CURRENT_DATE',
      );
      return;
    }

    qb.andWhere('invoice.status = :status', { status });
    if (status !== InvoiceStatusFilter.PAID) {
      // Exclude rows that are actually overdue so they show up only under the Overdue filter.
      qb.andWhere('invoice.dueDate >= CURRENT_DATE');
    }
  }
}
