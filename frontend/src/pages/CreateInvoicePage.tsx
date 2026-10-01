import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Snackbar, Typography } from '@mui/material';
import { AppLayout } from '../components/layout/AppLayout';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { createInvoice } from '../api/invoices.api';

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const [successOpen, setSuccessOpen] = useState(false);

  return (
    <AppLayout>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" mb={3}>
          New Invoice
        </Typography>
        <Paper sx={{ p: 3 }}>
          <InvoiceForm
            submitLabel="Create Invoice"
            savingLabel="Saving…"
            onSubmit={async (payload) => {
              await createInvoice(payload);
            }}
            onSuccess={() => {
              // Success notification + redirect to Invoice List, per spec §2.1.4.
              setSuccessOpen(true);
              setTimeout(() => navigate('/invoices'), 800);
            }}
            onCancel={() => navigate('/invoices')}
          />
        </Paper>

        <Snackbar
          open={successOpen}
          autoHideDuration={3000}
          onClose={() => setSuccessOpen(false)}
          message="Invoice created"
        />
      </Container>
    </AppLayout>
  );
}
