import { ChangeEvent, FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { AppLayout } from '../components/layout/AppLayout';
import { createInvoice } from '../api/invoices.api';
import {
  CreateInvoiceFormErrors,
  CreateInvoiceFormValues,
  DEFAULT_CREATE_INVOICE_VALUES,
  validateCreateInvoiceForm,
} from '../utils/validation';

const CURRENCY_OPTIONS = ['AUD', 'USD', 'GBP', 'EUR', 'SGD'];

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<CreateInvoiceFormValues>(DEFAULT_CREATE_INVOICE_VALUES);
  const [errors, setErrors] = useState<CreateInvoiceFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const setField =
    (field: keyof CreateInvoiceFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validateCreateInvoiceForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoice({
        customer: {
          fullname: values.customerFullname.trim(),
          email: values.customerEmail.trim(),
          mobileNumber: values.customerMobile.trim() || undefined,
          address: values.customerAddress.trim() || undefined,
        },
        item: {
          name: values.itemName.trim(),
          quantity: Number(values.itemQuantity),
          rate: Number(values.itemRate),
        },
        invoiceNumber: values.invoiceNumber.trim(),
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        currency: values.currency,
        description: values.description.trim() || undefined,
        tax: values.tax === '' ? undefined : Number(values.tax),
        discount: values.discount === '' ? undefined : Number(values.discount),
      });

      // Success notification + redirect to Invoice List, per spec §2.1.4.
      setSuccessOpen(true);
      setTimeout(() => navigate('/invoices'), 800);
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[] } } }).response
        ?.data;
      const message = data?.message;
      setSubmitError(
        Array.isArray(message) ? message.join(', ') : (message ?? 'Failed to create invoice.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" mb={3}>
          New Invoice
        </Typography>
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Typography variant="subtitle1" gutterBottom>
              Customer
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Customer name"
                  fullWidth
                  value={values.customerFullname}
                  onChange={setField('customerFullname')}
                  error={Boolean(errors.customerFullname)}
                  helperText={errors.customerFullname}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Customer email"
                  fullWidth
                  value={values.customerEmail}
                  onChange={setField('customerEmail')}
                  error={Boolean(errors.customerEmail)}
                  helperText={errors.customerEmail}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Customer mobile (optional)"
                  fullWidth
                  value={values.customerMobile}
                  onChange={setField('customerMobile')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Customer address (optional)"
                  fullWidth
                  value={values.customerAddress}
                  onChange={setField('customerAddress')}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom mt={3}>
              Invoice
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Invoice number"
                  fullWidth
                  value={values.invoiceNumber}
                  onChange={setField('invoiceNumber')}
                  error={Boolean(errors.invoiceNumber)}
                  helperText={errors.invoiceNumber}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Currency"
                  fullWidth
                  value={values.currency}
                  onChange={setField('currency')}
                  error={Boolean(errors.currency)}
                  helperText={errors.currency}
                >
                  {CURRENCY_OPTIONS.map((code) => (
                    <MenuItem key={code} value={code}>
                      {code}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Invoice date"
                  type="date"
                  fullWidth
                  value={values.invoiceDate}
                  onChange={setField('invoiceDate')}
                  error={Boolean(errors.invoiceDate)}
                  helperText={errors.invoiceDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due date"
                  type="date"
                  fullWidth
                  value={values.dueDate}
                  onChange={setField('dueDate')}
                  error={Boolean(errors.dueDate)}
                  helperText={errors.dueDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description (optional)"
                  fullWidth
                  multiline
                  minRows={2}
                  value={values.description}
                  onChange={setField('description')}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom mt={3}>
              Line Item
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Item name"
                  fullWidth
                  value={values.itemName}
                  onChange={setField('itemName')}
                  error={Boolean(errors.itemName)}
                  helperText={errors.itemName}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={values.itemQuantity}
                  onChange={setField('itemQuantity')}
                  error={Boolean(errors.itemQuantity)}
                  helperText={errors.itemQuantity}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Rate"
                  type="number"
                  fullWidth
                  value={values.itemRate}
                  onChange={setField('itemRate')}
                  error={Boolean(errors.itemRate)}
                  helperText={errors.itemRate}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  label="Tax %"
                  type="number"
                  fullWidth
                  value={values.tax}
                  onChange={setField('tax')}
                  error={Boolean(errors.tax)}
                  helperText={errors.tax}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  label="Discount"
                  type="number"
                  fullWidth
                  value={values.discount}
                  onChange={setField('discount')}
                  error={Boolean(errors.discount)}
                  helperText={errors.discount}
                />
              </Grid>
            </Grid>

            {submitError && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {submitError}
              </Alert>
            )}

            <Box mt={3} display="flex" gap={2}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Create Invoice'}
              </Button>
              <Button variant="text" onClick={() => navigate('/invoices')}>
                Cancel
              </Button>
            </Box>
          </form>
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
