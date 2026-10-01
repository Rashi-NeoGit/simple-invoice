import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as invoicesApi from '../api/invoices.api';
import { AuthProvider } from '../auth/AuthContext';
import { Invoice } from '../types/invoice';
import { EditInvoicePage } from './EditInvoicePage';

jest.mock('../api/invoices.api');

const DRAFT_INVOICE: Invoice = {
  invoiceId: 'inv-1',
  invoiceNumber: 'IV-1001',
  invoiceReference: null,
  invoiceDate: '2026-06-01',
  dueDate: '2026-07-01',
  currency: 'AUD',
  currencySymbol: 'AU$',
  description: null,
  status: 'Draft',
  invoiceSubTotal: 150,
  totalTax: 15,
  totalDiscount: 10,
  totalAmount: 155,
  totalPaid: 0,
  balanceAmount: 155,
  customer: {
    fullname: 'Jane Doe',
    email: 'jane@example.com',
    mobileNumber: '0411222333',
    address: 'Sydney',
  },
  items: [{ id: 'item-1', name: 'Widget', quantity: 3, rate: 50 }],
  createdAt: '2026-06-01T00:00:00.000Z',
  createdBy: 'user-1',
};

function renderPage(initialPath = '/invoices/inv-1/edit') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
          <Route path="/invoices/:id" element={<div>Invoice Detail Page</div>} />
          <Route path="/invoices" element={<div>Invoice List Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('EditInvoicePage', () => {
  it('pre-fills the form with the existing invoice values, including a back-computed tax percentage', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue(DRAFT_INVOICE);
    renderPage();

    expect(await screen.findByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IV-1001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Widget')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    // totalTax 15 / invoiceSubTotal 150 * 100 = 10%
    expect(screen.getByLabelText(/tax %/i)).toHaveValue(10);
    expect(screen.getByLabelText(/discount/i)).toHaveValue(10);
  });

  it('submits changes via PATCH, shows a success notification, and redirects to the invoice detail page', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue(DRAFT_INVOICE);
    (invoicesApi.updateInvoice as jest.Mock).mockResolvedValue({
      ...DRAFT_INVOICE,
      customer: { ...DRAFT_INVOICE.customer, fullname: 'John Updated' },
    });
    renderPage();
    const user = userEvent.setup();

    const nameInput = await screen.findByDisplayValue('Jane Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'John Updated');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(invoicesApi.updateInvoice).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          customer: expect.objectContaining({ fullname: 'John Updated' }),
        }),
      ),
    );

    expect(await screen.findByText(/invoice updated/i)).toBeInTheDocument();
    expect(await screen.findByText('Invoice Detail Page')).toBeInTheDocument();
  });

  it('surfaces a 409 error from the backend (e.g. the invoice stopped being Draft) without crashing', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue(DRAFT_INVOICE);
    (invoicesApi.updateInvoice as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Only Draft invoices can be edited' } },
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByDisplayValue('Jane Doe');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/only draft invoices can be edited/i)).toBeInTheDocument();
  });

  it('blocks editing (with a way back) when the invoice is not Draft, even via direct navigation', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockResolvedValue({ ...DRAFT_INVOICE, status: 'Paid' });
    renderPage();

    expect(await screen.findByText(/only draft invoices can be edited/i)).toBeInTheDocument();
    expect(invoicesApi.updateInvoice).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /back to invoice/i }));
    expect(await screen.findByText('Invoice Detail Page')).toBeInTheDocument();
  });

  it('shows an error state when the invoice cannot be loaded at all', async () => {
    (invoicesApi.fetchInvoice as jest.Mock).mockRejectedValue(new Error('network error'));
    renderPage();

    expect(await screen.findByText(/could not load this invoice/i)).toBeInTheDocument();
  });
});
