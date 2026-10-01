import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as invoicesApi from '../api/invoices.api';
import { AuthProvider } from '../auth/AuthContext';
import { Invoice } from '../types/invoice';
import { InvoiceDetailPage } from './InvoiceDetailPage';

jest.mock('../api/invoices.api');

const SAMPLE_INVOICE: Invoice = {
  invoiceId: 'inv-1',
  invoiceNumber: 'IV-1001',
  invoiceReference: '#REF-1',
  invoiceDate: '2026-06-01',
  dueDate: '2026-07-01',
  currency: 'AUD',
  currencySymbol: 'AU$',
  description: 'Consulting work',
  status: 'Pending',
  invoiceSubTotal: 200,
  totalTax: 20,
  totalDiscount: 10,
  totalAmount: 210,
  totalPaid: 50,
  balanceAmount: 160,
  customer: {
    fullname: 'Jane Doe',
    email: 'jane@example.com',
    mobileNumber: '0411222333',
    address: 'Sydney',
  },
  items: [{ id: 'item-1', name: 'Consulting Services', quantity: 2, rate: 90 }],
  createdAt: '2026-06-01T00:00:00.000Z',
  createdBy: 'user-1',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/invoices/inv-1']}>
      <AuthProvider>
        <Routes>
          <Route path="/invoices/:id/edit" element={<div>Edit Invoice Page</div>} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoices" element={<div>Invoice List Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('InvoiceDetailPage', () => {
  it('renders every field required by spec §2.1.3: invoice info, customer info, line items, and all amounts', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue(SAMPLE_INVOICE);
    renderPage();

    expect(await screen.findByText('IV-1001')).toBeInTheDocument();
    expect(screen.getByText(/ref: #ref-1/i)).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();

    // Customer information
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('0411222333')).toBeInTheDocument();
    expect(screen.getByText('Sydney')).toBeInTheDocument();

    // Line item
    expect(screen.getByText('Consulting Services')).toBeInTheDocument();

    // Subtotal, tax, discount, total, outstanding balance
    expect(screen.getByText('AU$200.00')).toBeInTheDocument();
    expect(screen.getByText('AU$20.00')).toBeInTheDocument();
    expect(screen.getByText('-AU$10.00')).toBeInTheDocument();
    expect(screen.getByText('AU$210.00')).toBeInTheDocument();
    expect(screen.getByText('AU$160.00')).toBeInTheDocument();

    // Status
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows an error state and a way back when the invoice cannot be loaded', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockRejectedValue(new Error('network error'));
    renderPage();

    expect(await screen.findByText(/could not load this invoice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to invoices/i })).toBeInTheDocument();
  });

  it('does not show an Edit button for a non-Draft invoice', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue(SAMPLE_INVOICE); // status: Pending
    renderPage();

    await screen.findByText('IV-1001');
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('shows an Edit button for a Draft invoice and navigates to the edit page', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue({
      ...SAMPLE_INVOICE,
      status: 'Draft',
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByText('IV-1001');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(await screen.findByText('Edit Invoice Page')).toBeInTheDocument();
  });
});
