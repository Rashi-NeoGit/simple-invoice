import { apiClient } from './client';
import { Invoice, InvoiceListQuery, PaginatedInvoices } from '../types/invoice';

export function fetchInvoices(query: InvoiceListQuery): Promise<PaginatedInvoices> {
  return apiClient.get<PaginatedInvoices>('/invoices', { params: query }).then((res) => res.data);
}

export function fetchInvoice(id: string): Promise<Invoice> {
  return apiClient.get<Invoice>(`/invoices/${id}`).then((res) => res.data);
}

export interface CreateInvoicePayload {
  customer: { fullname: string; email: string; mobileNumber?: string; address?: string };
  item: { name: string; quantity: number; rate: number };
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  description?: string;
  tax?: number;
  discount?: number;
}

export function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  return apiClient.post<Invoice>('/invoices', payload).then((res) => res.data);
}
