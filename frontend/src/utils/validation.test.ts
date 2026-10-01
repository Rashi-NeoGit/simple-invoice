import { DEFAULT_CREATE_INVOICE_VALUES, validateCreateInvoiceForm } from './validation';

function validValues() {
  return {
    ...DEFAULT_CREATE_INVOICE_VALUES,
    customerFullname: 'Jane Doe',
    customerEmail: 'jane@example.com',
    invoiceNumber: 'IV-1',
    invoiceDate: '2026-06-01',
    dueDate: '2026-07-01',
    itemName: 'Widget',
    itemRate: '50',
  };
}

describe('validateCreateInvoiceForm', () => {
  it('returns no errors for a fully valid form', () => {
    expect(validateCreateInvoiceForm(validValues())).toEqual({});
  });

  it('requires customer name and a valid email', () => {
    const errors = validateCreateInvoiceForm({
      ...validValues(),
      customerFullname: '',
      customerEmail: 'not-an-email',
    });
    expect(errors.customerFullname).toBeTruthy();
    expect(errors.customerEmail).toBeTruthy();
  });

  it('requires a unique-looking, non-empty invoice number', () => {
    const errors = validateCreateInvoiceForm({ ...validValues(), invoiceNumber: '' });
    expect(errors.invoiceNumber).toBeTruthy();
  });

  it('rejects a due date before the invoice date', () => {
    const errors = validateCreateInvoiceForm({
      ...validValues(),
      invoiceDate: '2026-06-10',
      dueDate: '2026-06-01',
    });
    expect(errors.dueDate).toMatch(/on or after invoice date/i);
  });

  it('accepts a due date equal to the invoice date', () => {
    const errors = validateCreateInvoiceForm({
      ...validValues(),
      invoiceDate: '2026-06-01',
      dueDate: '2026-06-01',
    });
    expect(errors.dueDate).toBeUndefined();
  });

  it('requires item quantity to be a positive integer', () => {
    expect(
      validateCreateInvoiceForm({ ...validValues(), itemQuantity: '0' }).itemQuantity,
    ).toBeTruthy();
    expect(
      validateCreateInvoiceForm({ ...validValues(), itemQuantity: '1.5' }).itemQuantity,
    ).toBeTruthy();
    expect(
      validateCreateInvoiceForm({ ...validValues(), itemQuantity: '2' }).itemQuantity,
    ).toBeUndefined();
  });

  it('requires item rate to be a positive number', () => {
    expect(validateCreateInvoiceForm({ ...validValues(), itemRate: '0' }).itemRate).toBeTruthy();
    expect(validateCreateInvoiceForm({ ...validValues(), itemRate: '-5' }).itemRate).toBeTruthy();
  });

  it('rejects a negative tax or discount but allows zero', () => {
    expect(validateCreateInvoiceForm({ ...validValues(), tax: '-1' }).tax).toBeTruthy();
    expect(validateCreateInvoiceForm({ ...validValues(), discount: '-1' }).discount).toBeTruthy();
    expect(validateCreateInvoiceForm({ ...validValues(), tax: '0', discount: '0' })).toEqual({});
  });

  it('treats customer mobile and address as optional', () => {
    const errors = validateCreateInvoiceForm({
      ...validValues(),
      customerMobile: '',
      customerAddress: '',
    });
    expect(errors.customerMobile).toBeUndefined();
    expect(errors.customerAddress).toBeUndefined();
  });
});
