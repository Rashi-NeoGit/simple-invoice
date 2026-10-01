import { roundMoney } from '../common/money';
import { InvoiceStatus } from './invoice.entity';

export interface InvoiceTotals {
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
}

/**
 * Server-side-only calculation per spec §2.3.2:
 *   subTotal    = quantity * rate
 *   taxAmount   = subTotal * (tax% / 100)
 *   totalAmount = subTotal + taxAmount - discount
 */
export function calculateInvoiceTotals(
  quantity: number,
  rate: number,
  taxPercent: number,
  discount: number,
): InvoiceTotals {
  const subTotal = roundMoney(quantity * rate);
  const taxAmount = roundMoney(subTotal * (taxPercent / 100));
  const totalAmount = roundMoney(subTotal + taxAmount - discount);
  return { subTotal, taxAmount, totalAmount };
}

/** balanceAmount = totalAmount - totalPaid */
export function calculateBalance(totalAmount: number, totalPaid: number): number {
  return roundMoney(totalAmount - totalPaid);
}

export type DerivedInvoiceStatus = InvoiceStatus | 'Overdue';

/**
 * Overdue is never persisted (spec §2.3.2). It's computed here, at response-mapping time:
 *   if status != Paid AND dueDate < today -> "Overdue"
 *   otherwise                             -> the persisted status
 *
 * Dates are compared at day granularity (not instant) so a due date of "today" is NOT overdue.
 */
export function deriveInvoiceStatus(
  persistedStatus: InvoiceStatus,
  dueDate: string | Date,
  today: Date = new Date(),
): DerivedInvoiceStatus {
  if (persistedStatus === InvoiceStatus.PAID) {
    return persistedStatus;
  }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return dueMidnight < todayMidnight ? 'Overdue' : persistedStatus;
}
