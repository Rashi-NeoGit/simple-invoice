import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { getCurrencySymbol } from '../../common/currency';
import { InvoiceItem } from '../../invoices/invoice-item.entity';
import { Invoice, InvoiceStatus } from '../../invoices/invoice.entity';
import { calculateBalance, calculateInvoiceTotals } from '../../invoices/invoices.calculations';
import { User } from '../../users/user.entity';
import { AppDataSource } from '../data-source';

const REVIEWER_EMAIL = 'reviewer@example.com';
const REVIEWER_PASSWORD = 'Reviewer@12345';

interface SeedCustomer {
  fullname: string;
  email: string;
  mobileNumber: string;
  address: string;
}

const CUSTOMERS: SeedCustomer[] = [
  {
    fullname: 'Paul Tan',
    email: 'paul@101digital.io',
    mobileNumber: '947717364111',
    address: 'Singapore',
  },
  {
    fullname: 'Siti Rahman',
    email: 'siti@acme.sg',
    mobileNumber: '911234567',
    address: 'Kuala Lumpur, Malaysia',
  },
  {
    fullname: 'John Smith',
    email: 'john.smith@example.com',
    mobileNumber: '0411222333',
    address: 'Sydney, Australia',
  },
  {
    fullname: 'Emily Clarke',
    email: 'emily.clarke@example.co.uk',
    mobileNumber: '7911123456',
    address: 'London, UK',
  },
  {
    fullname: 'Wei Zhang',
    email: 'wei.zhang@example.com',
    mobileNumber: '13800000000',
    address: 'Shanghai, China',
  },
  {
    fullname: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    mobileNumber: '611234567',
    address: 'Madrid, Spain',
  },
];

const CURRENCIES = ['AUD', 'USD', 'GBP'];
const ITEM_NAMES = [
  'Honda RC150',
  'Consulting Services',
  'Web Design Package',
  'Annual Support Plan',
  'Office Supplies',
  'Logo Design',
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function upsertReviewerUser(): Promise<User> {
  const repo = AppDataSource.getRepository(User);
  let user = await repo.findOne({ where: { email: REVIEWER_EMAIL } });
  if (!user) {
    const passwordHash = await bcrypt.hash(REVIEWER_PASSWORD, 10);
    user = repo.create({ email: REVIEWER_EMAIL, passwordHash, fullname: 'Reviewer Account' });
    user = await repo.save(user);
    console.log(`Created reviewer user: ${REVIEWER_EMAIL}`);
  } else {
    console.log(`Reviewer user already exists: ${REVIEWER_EMAIL}`);
  }
  return user;
}

interface SeedInvoiceSpec {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  customer: SeedCustomer;
  currency: string;
  itemName: string;
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
  totalPaidRatio: number;
}

/**
 * Builds a diverse set of seed invoices. Due dates are always derived as
 * invoiceDate + a non-negative offset, so `dueDate >= invoiceDate` holds by
 * construction for every record (mirrors the DB CHECK constraint and the
 * create-invoice validation rule — seed data obeys the same business rule).
 */
function buildSeedInvoices(): SeedInvoiceSpec[] {
  const today = new Date();
  const specs: SeedInvoiceSpec[] = [];

  // First record mirrors the Appendix A sample shape/fields.
  specs.push({
    invoiceNumber: 'IV1780488206995',
    invoiceDate: addDays(today, -28),
    dueDate: addDays(today, 2),
    status: InvoiceStatus.PENDING,
    customer: CUSTOMERS[0],
    currency: 'AUD',
    itemName: 'Honda RC150',
    quantity: 2,
    rate: 1000,
    tax: 10,
    discount: 20,
    totalPaidRatio: 0.666,
  });

  const statusCycle = [
    InvoiceStatus.DRAFT,
    InvoiceStatus.PENDING,
    InvoiceStatus.PAID,
    InvoiceStatus.PENDING,
    InvoiceStatus.DRAFT,
  ];
  // Days-after-invoice-date offsets for the due date — always >= 0, spans wide enough
  // that, combined with varying invoice-date ages below, both overdue and future-due
  // invoices occur naturally without special-casing every record.
  const dueOffsetsFromInvoiceDate = [10, 20, 30, 45, 60, 95];
  const generatedCount = 33;

  for (let i = 0; i < generatedCount; i++) {
    const status = statusCycle[i % statusCycle.length];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const currency = CURRENCIES[i % CURRENCIES.length];
    const itemName = ITEM_NAMES[i % ITEM_NAMES.length];

    const invoiceAgeDays = 90 - i * 2; // spreads invoice dates from ~90 days ago to ~26 days ago
    const invoiceDate = addDays(today, -invoiceAgeDays);
    const dueOffset = dueOffsetsFromInvoiceDate[i % dueOffsetsFromInvoiceDate.length];
    const dueDate = addDays(invoiceDate, dueOffset);

    const quantity = 1 + (i % 5);
    const rate = 50 + (i % 10) * 37.5;
    const tax = i % 7 === 0 ? 0 : 10;
    const discount = i % 5 === 0 ? 15 : 0;

    specs.push({
      invoiceNumber: `IV${2026000000 + i}`,
      invoiceDate,
      dueDate,
      status,
      customer,
      currency,
      itemName,
      quantity,
      rate,
      tax,
      discount,
      totalPaidRatio:
        status === InvoiceStatus.PAID ? 1 : status === InvoiceStatus.PENDING ? 0.4 : 0,
    });
  }

  // Guarantee at least one explicitly overdue (non-Paid, past due date) and one due
  // exactly today, regardless of how the cyclic generation above happens to land.
  specs.push({
    invoiceNumber: 'IV2026999001',
    invoiceDate: addDays(today, -45),
    dueDate: addDays(today, -15),
    status: InvoiceStatus.PENDING,
    customer: CUSTOMERS[1],
    currency: 'USD',
    itemName: 'Consulting Services',
    quantity: 10,
    rate: 120,
    tax: 10,
    discount: 0,
    totalPaidRatio: 0.2,
  });
  specs.push({
    invoiceNumber: 'IV2026999002',
    invoiceDate: addDays(today, -14),
    dueDate: today,
    status: InvoiceStatus.DRAFT,
    customer: CUSTOMERS[2],
    currency: 'GBP',
    itemName: 'Web Design Package',
    quantity: 1,
    rate: 2500,
    tax: 10,
    discount: 100,
    totalPaidRatio: 0,
  });

  return specs;
}

async function seedInvoices(createdBy: string): Promise<void> {
  const invoiceRepo = AppDataSource.getRepository(Invoice);
  const specs = buildSeedInvoices();
  let createdCount = 0;
  let skippedCount = 0;

  for (const spec of specs) {
    // Idempotent: safe to run `npm run seed` more than once without erroring or duplicating.
    const existing = await invoiceRepo.findOne({ where: { invoiceNumber: spec.invoiceNumber } });
    if (existing) {
      skippedCount++;
      continue;
    }

    const { subTotal, taxAmount, totalAmount } = calculateInvoiceTotals(
      spec.quantity,
      spec.rate,
      spec.tax,
      spec.discount,
    );
    const totalPaid = Math.round(totalAmount * spec.totalPaidRatio * 100) / 100;
    const balanceAmount = calculateBalance(totalAmount, totalPaid);

    const invoiceItem = new InvoiceItem();
    invoiceItem.name = spec.itemName;
    invoiceItem.quantity = spec.quantity;
    invoiceItem.rate = spec.rate;

    const invoice = invoiceRepo.create({
      invoiceNumber: spec.invoiceNumber,
      invoiceDate: toDateString(spec.invoiceDate),
      dueDate: toDateString(spec.dueDate),
      currency: spec.currency,
      currencySymbol: getCurrencySymbol(spec.currency),
      description: `Invoice issued to ${spec.customer.fullname}`,
      status: spec.status,
      invoiceSubTotal: subTotal,
      totalTax: taxAmount,
      totalDiscount: spec.discount,
      totalAmount,
      totalPaid,
      balanceAmount,
      customerFullname: spec.customer.fullname,
      customerEmail: spec.customer.email,
      customerMobile: spec.customer.mobileNumber,
      customerAddress: spec.customer.address,
      createdBy,
      items: [invoiceItem],
    });

    await invoiceRepo.save(invoice);
    createdCount++;
  }

  console.log(
    `Seed complete: ${createdCount} invoice(s) created, ${skippedCount} already existed and were skipped.`,
  );
}

async function run(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const reviewer = await upsertReviewerUser();
    await seedInvoices(reviewer.id);
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
