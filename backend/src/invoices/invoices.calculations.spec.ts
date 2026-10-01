import { InvoiceStatus } from './invoice.entity';
import {
  calculateBalance,
  calculateInvoiceTotals,
  deriveInvoiceStatus,
} from './invoices.calculations';

describe('calculateInvoiceTotals', () => {
  it('computes subTotal, taxAmount, and totalAmount per the spec formulas', () => {
    // subTotal = 2 * 1000 = 2000; taxAmount = 2000 * 10% = 200; totalAmount = 2000 + 200 - 20 = 2180
    const result = calculateInvoiceTotals(2, 1000, 10, 20);
    expect(result).toEqual({ subTotal: 2000, taxAmount: 200, totalAmount: 2180 });
  });

  it('defaults correctly reflect a zero-tax, zero-discount invoice', () => {
    const result = calculateInvoiceTotals(3, 50, 0, 0);
    expect(result).toEqual({ subTotal: 150, taxAmount: 0, totalAmount: 150 });
  });

  it('rounds to 2 decimal places to avoid floating-point artifacts', () => {
    const result = calculateInvoiceTotals(3, 10.1, 7.5, 0);
    // subTotal = 30.3, taxAmount = 30.3 * 0.075 = 2.2725 -> 2.27 (rounded) -> total 32.57
    expect(result.subTotal).toBe(30.3);
    expect(result.taxAmount).toBeCloseTo(2.27, 2);
    expect(result.totalAmount).toBeCloseTo(32.57, 2);
  });
});

describe('calculateBalance', () => {
  it('subtracts totalPaid from totalAmount', () => {
    expect(calculateBalance(2180, 1451.34)).toBeCloseTo(728.66, 2);
  });

  it('returns the full totalAmount when nothing has been paid', () => {
    expect(calculateBalance(500, 0)).toBe(500);
  });
});

describe('deriveInvoiceStatus', () => {
  const today = new Date('2026-06-15T00:00:00Z');

  it('never derives Overdue for a Paid invoice, even with a past due date', () => {
    expect(deriveInvoiceStatus(InvoiceStatus.PAID, '2026-01-01', today)).toBe(InvoiceStatus.PAID);
  });

  it('derives Overdue for a non-Paid invoice whose due date has passed', () => {
    expect(deriveInvoiceStatus(InvoiceStatus.PENDING, '2026-06-01', today)).toBe('Overdue');
    expect(deriveInvoiceStatus(InvoiceStatus.DRAFT, '2026-06-14', today)).toBe('Overdue');
  });

  it('does NOT derive Overdue when the due date is exactly today', () => {
    expect(deriveInvoiceStatus(InvoiceStatus.PENDING, '2026-06-15', today)).toBe(
      InvoiceStatus.PENDING,
    );
  });

  it('returns the persisted status when the due date is in the future', () => {
    expect(deriveInvoiceStatus(InvoiceStatus.DRAFT, '2026-07-01', today)).toBe(InvoiceStatus.DRAFT);
  });
});
