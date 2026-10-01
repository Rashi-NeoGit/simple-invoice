import { Suspense, lazy } from 'react';
import { Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { InvoiceListPage } from './pages/InvoiceListPage';
import { LoginPage } from './pages/LoginPage';
import { theme } from './theme';

// Login and Invoice List are the two first-paint-critical screens (the latter is the
// default home screen after login, per spec §2.1.2) — loaded eagerly. Everything a
// user only reaches by navigating further is code-split, so its JS isn't downloaded
// or parsed until actually visited.
const InvoiceDetailPage = lazy(() =>
  import('./pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })),
);
const CreateInvoicePage = lazy(() =>
  import('./pages/CreateInvoicePage').then((m) => ({ default: m.CreateInvoicePage })),
);
const EditInvoicePage = lazy(() =>
  import('./pages/EditInvoicePage').then((m) => ({ default: m.EditInvoicePage })),
);

function RouteFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
      <CircularProgress />
    </Box>
  );
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                {/* Invoice List is the default home screen after login, per spec §2.1.2 */}
                <Route path="/invoices" element={<InvoiceListPage />} />
                <Route path="/invoices/new" element={<CreateInvoicePage />} />
                <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/" element={<Navigate to="/invoices" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/invoices" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
