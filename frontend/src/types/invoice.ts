export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue';

export interface Customer {
  fullname: string;
  email: string;
  mobileNumber: string | null;
  address: string | null;
}

export interface InvoiceLineItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description: string | null;
  status: InvoiceStatus;
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  customer: Customer;
  items: InvoiceLineItem[];
  createdAt: string;
  createdBy: string;
}

export interface PagingInfo {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedInvoices {
  data: Invoice[];
  paging: PagingInfo;
}

export type SortField = 'invoiceDate' | 'dueDate' | 'totalAmount';
export type SortOrder = 'ASC' | 'DESC';

export interface InvoiceListQuery {
  page: number;
  pageSize: number;
  sortBy?: SortField;
  ordering?: SortOrder;
  status?: InvoiceStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}
