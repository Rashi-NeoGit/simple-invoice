import { deriveInvoiceStatus } from './invoices.calculations';
import { Invoice } from './invoice.entity';

/**
 * List and detail both return this same shape (spec §3 field names, with customer/items
 * nested exactly as §3.2/§3.3 and Appendix A show them) — the frontend list view just
 * renders a subset of these columns.
 */
export function toInvoiceResponse(invoice: Invoice) {
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceReference: invoice.invoiceReference ?? null,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    currencySymbol: invoice.currencySymbol,
    description: invoice.description ?? null,
    status: deriveInvoiceStatus(invoice.status, invoice.dueDate),
    invoiceSubTotal: invoice.invoiceSubTotal,
    totalTax: invoice.totalTax,
    totalDiscount: invoice.totalDiscount,
    totalAmount: invoice.totalAmount,
    totalPaid: invoice.totalPaid,
    balanceAmount: invoice.balanceAmount,
    customer: {
      fullname: invoice.customerFullname,
      email: invoice.customerEmail,
      mobileNumber: invoice.customerMobile ?? null,
      address: invoice.customerAddress ?? null,
    },
    items: (invoice.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      rate: item.rate,
    })),
    createdAt: invoice.createdAt,
    createdBy: invoice.createdBy,
  };
}

export type InvoiceResponse = ReturnType<typeof toInvoiceResponse>;
