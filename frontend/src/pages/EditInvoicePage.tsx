import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppLayout } from '../components/layout/AppLayout';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { fetchInvoice, updateInvoice } from '../api/invoices.api';
import { Invoice } from '../types/invoice';
import { CreateInvoiceFormValues } from '../utils/validation';

function toFormValues(invoice: Invoice): CreateInvoiceFormValues {
  const item = invoice.items[0];
  // tax is edited as a percentage but only the computed amount (totalTax) is stored,
  // so it's backed out from subtotal/tax here; resubmitting recomputes everything
  // server-side regardless, so a sub-cent rounding difference here is harmless.
  const taxPercent =
    invoice.invoiceSubTotal > 0
      ? Math.round((invoice.totalTax / invoice.invoiceSubTotal) * 100 * 100) / 100
      : 0;

  return {
    customerFullname: invoice.customer.fullname,
    customerEmail: invoice.customer.email,
    customerMobile: invoice.customer.mobileNumber ?? '',
    customerAddress: invoice.customer.address ?? '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    description: invoice.description ?? '',
    itemName: item?.name ?? '',
    itemQuantity: String(item?.quantity ?? 1),
    itemRate: String(item?.rate ?? ''),
    tax: String(taxPercent),
    discount: String(invoice.totalDiscount),
  };
}

export function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    fetchInvoice(id)
      .then(setInvoice)
      .catch(() => setError('Could not load this invoice.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error || !invoice || !id) {
    return (
      <AppLayout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Typography color="error">{error ?? 'Invoice not found.'}</Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices')}
            sx={{ mt: 2 }}
          >
            Back to invoices
          </Button>
        </Container>
      </AppLayout>
    );
  }

  // Defense in depth: the Invoice Detail page only shows the Edit button for Draft
  // invoices, but this guards direct navigation to the URL too (e.g. a stale link,
  // or the invoice's status having changed since the page was last loaded).
  if (invoice.status !== 'Draft') {
    return (
      <AppLayout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Alert severity="warning">
            Only Draft invoices can be edited — this invoice is {invoice.status}.
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/invoices/${id}`)}
            sx={{ mt: 2 }}
          >
            Back to invoice
          </Button>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" mb={3}>
          Edit Invoice
        </Typography>
        <Paper sx={{ p: 3 }}>
          <InvoiceForm
            initialValues={toFormValues(invoice)}
            submitLabel="Save Changes"
            savingLabel="Saving…"
            onSubmit={async (payload) => {
              await updateInvoice(id, payload);
            }}
            onSuccess={() => {
              setSuccessOpen(true);
              setTimeout(() => navigate(`/invoices/${id}`), 800);
            }}
            onCancel={() => navigate(`/invoices/${id}`)}
          />
        </Paper>

        <Snackbar
          open={successOpen}
          autoHideDuration={3000}
          onClose={() => setSuccessOpen(false)}
          message="Invoice updated"
        />
      </Container>
    </AppLayout>
  );
}
