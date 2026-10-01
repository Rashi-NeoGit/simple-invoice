import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as invoicesApi from '../api/invoices.api';
import { AuthProvider } from '../auth/AuthContext';
import { Invoice } from '../types/invoice';
import { InvoiceListPage } from './InvoiceListPage';

jest.mock('../api/invoices.api');

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    invoiceId: 'inv-1',
    invoiceNumber: 'IV-1001',
    invoiceReference: null,
    invoiceDate: '2026-06-01',
    dueDate: '2026-07-01',
    currency: 'AUD',
    currencySymbol: 'AU$',
    description: null,
    status: 'Pending',
    invoiceSubTotal: 100,
    totalTax: 10,
    totalDiscount: 0,
    totalAmount: 110,
    totalPaid: 0,
    balanceAmount: 110,
    customer: {
      fullname: 'Jane Doe',
      email: 'jane@example.com',
      mobileNumber: null,
      address: null,
    },
    items: [{ id: 'item-1', name: 'Widget', quantity: 1, rate: 100 }],
    createdAt: '2026-06-01T00:00:00.000Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/invoices']}>
      <AuthProvider>
        <Routes>
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/new" element={<div>Create Invoice Page</div>} />
          <Route path="/invoices/:id" element={<div>Invoice Detail Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('InvoiceListPage', () => {
  beforeEach(() => {
    (invoicesApi.fetchInvoices as jest.Mock).mockResolvedValue({
      data: [buildInvoice()],
      paging: { page: 1, pageSize: 10, total: 1 },
    });
  });

  it('loads and displays invoices on mount', async () => {
    renderPage();
    expect(await screen.findByText('IV-1001')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows a designed empty state when there are no results', async () => {
    (invoicesApi.fetchInvoices as jest.Mock).mockResolvedValue({
      data: [],
      paging: { page: 1, pageSize: 10, total: 0 },
    });
    renderPage();
    expect(
      await screen.findByText(/no invoices match your search or filters/i),
    ).toBeInTheDocument();
  });

  it('debounces the search box so it does not fire a request per keystroke', async () => {
    jest.useFakeTimers();
    renderPage();
    await screen.findByText('IV-1001');

    const searchBox = screen.getByLabelText(/search invoices by invoice number or customer name/i);
    fireEvent.change(searchBox, { target: { value: 'acme' } });

    expect(invoicesApi.fetchInvoices).not.toHaveBeenCalledWith(
      expect.objectContaining({ keyword: 'acme' }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() =>
      expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'acme' }),
      ),
    );
    jest.useRealTimers();
  });

  it('applies the status filter', async () => {
    renderPage();
    await screen.findByText('IV-1001');
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: /status/i }));
    await user.click(await screen.findByRole('option', { name: 'Overdue' }));

    await waitFor(() =>
      expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Overdue' }),
      ),
    );
  });

  it('imposes no default sort — the list loads without any column marked active, and without sortBy/ordering sent to the API', async () => {
    renderPage();
    await screen.findByText('IV-1001');

    expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
      expect.not.objectContaining({ sortBy: expect.anything() }),
    );
    expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
      expect.not.objectContaining({ ordering: expect.anything() }),
    );

    // MUI marks the active sort column via aria-sort; none should be set initially.
    for (const header of ['Invoice Date', 'Due Date', 'Total Amount']) {
      const cell = screen.getByText(header).closest('th');
      expect(cell).not.toHaveAttribute('aria-sort', 'ascending');
      expect(cell).not.toHaveAttribute('aria-sort', 'descending');
    }
  });

  it('toggles sort direction when the same column header is clicked twice, and resets to ascending on a new column', async () => {
    renderPage();
    await screen.findByText('IV-1001');

    fireEvent.click(screen.getByText('Total Amount'));
    await waitFor(() =>
      expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'totalAmount', ordering: 'ASC' }),
      ),
    );
    // Wait for the resulting re-fetch to actually resolve and the table to settle
    // out of its loading state — toHaveBeenCalledWith only confirms the call was
    // made, not that the component finished re-rendering with the response.
    await screen.findByText('IV-1001');

    fireEvent.click(screen.getByText('Total Amount'));
    await waitFor(() =>
      expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'totalAmount', ordering: 'DESC' }),
      ),
    );
    await screen.findByText('IV-1001');

    fireEvent.click(screen.getByText('Due Date'));
    await waitFor(() =>
      expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'dueDate', ordering: 'ASC' }),
      ),
    );
  });

  it('navigates to the invoice detail page when a row is clicked', async () => {
    renderPage();
    const row = await screen.findByText('IV-1001');
    const user = userEvent.setup();
    await user.click(row);

    expect(await screen.findByText('Invoice Detail Page')).toBeInTheDocument();
  });

  it('navigates to the create invoice page from the New Invoice button', async () => {
    renderPage();
    await screen.findByText('IV-1001');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /new invoice/i }));

    expect(await screen.findByText('Create Invoice Page')).toBeInTheDocument();
  });
});
