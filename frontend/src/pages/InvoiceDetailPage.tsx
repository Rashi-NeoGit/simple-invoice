import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/invoices/StatusBadge';
import { fetchInvoice } from '../api/invoices.api';
import { Invoice } from '../types/invoice';
import { formatAmount } from '../utils/formatAmount';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    // Always fetched fresh from the API (never reused from list-page state), so the
    // detail view accurately reflects the stored record per spec §2.1.3.
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

  if (error || !invoice) {
    return (
      <AppLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
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

  return (
    <AppLayout>
      <Container maxWidth="md" sx={{ py: 4 }} className="print-container">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          className="no-print"
        >
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')}>
            Back to invoices
          </Button>
          <Stack direction="row" spacing={1}>
            {/* Only Draft invoices are editable — enforced again server-side, this is just the UI entry point. */}
            {invoice.status === 'Draft' && (
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                onClick={() => navigate(`/invoices/${invoice.invoiceId}/edit`)}
              >
                Edit
              </Button>
            )}
            <Button startIcon={<PrintIcon />} variant="outlined" onClick={() => window.print()}>
              Print Invoice
            </Button>
          </Stack>
        </Stack>

        <Card className="print-area">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h5">{invoice.invoiceNumber}</Typography>
                {invoice.invoiceReference && (
                  <Typography variant="body2" color="text.secondary">
                    Ref: {invoice.invoiceReference}
                  </Typography>
                )}
              </Box>
              <StatusBadge status={invoice.status} />
            </Stack>

            <Grid container spacing={3} mb={2}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Invoice Date
                </Typography>
                <Typography>{invoice.invoiceDate}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Due Date
                </Typography>
                <Typography>{invoice.dueDate}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Currency
                </Typography>
                <Typography>{invoice.currency}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Bill To
            </Typography>
            <Typography>{invoice.customer.fullname}</Typography>
            <Typography color="text.secondary">{invoice.customer.email}</Typography>
            {invoice.customer.mobileNumber && (
              <Typography color="text.secondary">{invoice.customer.mobileNumber}</Typography>
            )}
            {invoice.customer.address && (
              <Typography color="text.secondary">{invoice.customer.address}</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatAmount(item.rate, invoice.currencySymbol)}
                    </TableCell>
                    <TableCell align="right">
                      {formatAmount(item.quantity * item.rate, invoice.currencySymbol)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box mt={2} ml="auto" maxWidth={280}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>
                  {formatAmount(invoice.invoiceSubTotal, invoice.currencySymbol)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Tax</Typography>
                <Typography>{formatAmount(invoice.totalTax, invoice.currencySymbol)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Discount</Typography>
                <Typography>
                  -{formatAmount(invoice.totalDiscount, invoice.currencySymbol)}
                </Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>Total</Typography>
                <Typography fontWeight={600}>
                  {formatAmount(invoice.totalAmount, invoice.currencySymbol)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Outstanding Balance</Typography>
                <Typography>
                  {formatAmount(invoice.balanceAmount, invoice.currencySymbol)}
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </AppLayout>
  );
}
