import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as authApi from '../api/auth.api';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

jest.mock('../api/auth.api');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invoices" element={<div>Invoice List Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('shows validation errors when submitted empty, without calling the API', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('rejects a malformed email client-side', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'something');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('logs in successfully and redirects to the invoice list (the default home screen)', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      accessToken: 'token-123',
      user: { id: 'user-1', email: 'reviewer@example.com', fullname: 'Reviewer' },
    });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'reviewer@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Reviewer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith('reviewer@example.com', 'Reviewer@12345'),
    );
    expect(await screen.findByText('Invoice List Page')).toBeInTheDocument();
  });

  it('surfaces an invalid-credentials error from the backend', async () => {
    (authApi.login as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Invalid email or password' } },
    });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'reviewer@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
