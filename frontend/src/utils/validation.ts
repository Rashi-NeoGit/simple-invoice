export interface CreateInvoiceFormValues {
  customerFullname: string;
  customerEmail: string;
  customerMobile: string;
  customerAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  description: string;
  itemName: string;
  itemQuantity: string;
  itemRate: string;
  tax: string;
  discount: string;
}

export type CreateInvoiceFormErrors = Partial<Record<keyof CreateInvoiceFormValues, string>>;

export const DEFAULT_CREATE_INVOICE_VALUES: CreateInvoiceFormValues = {
  customerFullname: '',
  customerEmail: '',
  customerMobile: '',
  customerAddress: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  currency: 'AUD',
  description: '',
  itemName: '',
  itemQuantity: '1',
  itemRate: '',
  tax: '10',
  discount: '0',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mirrors the backend's field-for-field validation table (spec §2.1.4) so the user gets
 * instant feedback, while the backend remains the source of truth (the API re-validates
 * everything regardless of what the client already checked).
 */
export function validateCreateInvoiceForm(
  values: CreateInvoiceFormValues,
): CreateInvoiceFormErrors {
  const errors: CreateInvoiceFormErrors = {};

  if (!values.customerFullname.trim()) {
    errors.customerFullname = 'Customer name is required';
  }

  if (!values.customerEmail.trim()) {
    errors.customerEmail = 'Customer email is required';
  } else if (!EMAIL_REGEX.test(values.customerEmail.trim())) {
    errors.customerEmail = 'Enter a valid email address';
  }

  if (!values.invoiceNumber.trim()) {
    errors.invoiceNumber = 'Invoice number is required';
  }

  if (!values.invoiceDate) {
    errors.invoiceDate = 'Invoice date is required';
  }

  if (!values.dueDate) {
    errors.dueDate = 'Due date is required';
  } else if (values.invoiceDate && new Date(values.dueDate) < new Date(values.invoiceDate)) {
    errors.dueDate = 'Due date must be on or after invoice date';
  }

  if (!values.currency.trim()) {
    errors.currency = 'Currency is required';
  }

  if (!values.itemName.trim()) {
    errors.itemName = 'Item name is required';
  }

  const quantity = Number(values.itemQuantity);
  if (!values.itemQuantity || !Number.isInteger(quantity) || quantity <= 0) {
    errors.itemQuantity = 'Quantity must be a positive integer';
  }

  const rate = Number(values.itemRate);
  if (!values.itemRate || !(rate > 0)) {
    errors.itemRate = 'Rate must be a positive number';
  }

  if (values.tax !== '' && (Number.isNaN(Number(values.tax)) || Number(values.tax) < 0)) {
    errors.tax = 'Tax must be a non-negative number';
  }

  if (
    values.discount !== '' &&
    (Number.isNaN(Number(values.discount)) || Number(values.discount) < 0)
  ) {
    errors.discount = 'Discount must be a non-negative number';
  }

  return errors;
}
