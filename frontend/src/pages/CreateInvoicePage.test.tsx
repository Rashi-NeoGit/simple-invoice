import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as invoicesApi from '../api/invoices.api';
import { AuthProvider } from '../auth/AuthContext';
import { CreateInvoicePage } from './CreateInvoicePage';

jest.mock('../api/invoices.api');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/invoices/new']}>
      <AuthProvider>
        <Routes>
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/invoices" element={<div>Invoice List Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, invoiceNumber = 'IV-100') {
  await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/invoice number/i), invoiceNumber);
  fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2026-06-01' } });
  fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-01' } });
  await user.type(screen.getByLabelText(/item name/i), 'Widget');
  await user.clear(screen.getByLabelText(/rate/i));
  await user.type(screen.getByLabelText(/rate/i), '50');
}

describe('CreateInvoicePage', () => {
  it('defaults tax to 10 and discount to 0, per spec', () => {
    renderPage();
    expect(screen.getByLabelText(/tax %/i)).toHaveValue(10);
    expect(screen.getByLabelText(/discount/i)).toHaveValue(0);
  });

  it('shows validation errors for required fields when submitted empty, without calling the API', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/customer email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice date is required/i)).toBeInTheDocument();
    expect(screen.getByText(/item name is required/i)).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a due date before the invoice date, client-side, mirroring the backend rule', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/invoice number/i), 'IV-100');
    fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-06-01' } });
    await user.type(screen.getByLabelText(/item name/i), 'Widget');
    await user.clear(screen.getByLabelText(/rate/i));
    await user.type(screen.getByLabelText(/rate/i), '50');

    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(
      await screen.findByText(/due date must be on or after invoice date/i),
    ).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('submits a valid form with the expected payload shape, shows a success notification, and redirects to the invoice list', async () => {
    (invoicesApi.createInvoice as jest.Mock).mockResolvedValue({ invoiceId: 'abc123' });
    renderPage();
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(invoicesApi.createInvoice).toHaveBeenCalledTimes(1));
    expect(invoicesApi.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'IV-100',
        invoiceDate: '2026-06-01',
        dueDate: '2026-07-01',
        currency: 'AUD',
        tax: 10,
        discount: 0,
        customer: expect.objectContaining({ fullname: 'Jane Doe', email: 'jane@example.com' }),
        item: expect.objectContaining({ name: 'Widget', quantity: 1, rate: 50 }),
      }),
    );

    expect(await screen.findByText(/invoice created/i)).toBeInTheDocument();
    expect(await screen.findByText(/invoice list page/i)).toBeInTheDocument();
  });

  it('surfaces a server-side error (e.g. duplicate invoice number) without crashing', async () => {
    (invoicesApi.createInvoice as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Invoice number must be unique' } },
    });
    renderPage();
    const user = userEvent.setup();

    await fillValidForm(user, 'IV-DUP');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText(/invoice number must be unique/i)).toBeInTheDocument();
  });
});
