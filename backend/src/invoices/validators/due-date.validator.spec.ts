import { ValidationArguments } from 'class-validator';
import { IsOnOrAfterInvoiceDateConstraint } from './due-date.validator';

function argsFor(invoiceDate?: string): ValidationArguments {
  return {
    value: undefined,
    constraints: [],
    targetName: 'CreateInvoiceDto',
    object: { invoiceDate },
    property: 'dueDate',
  };
}

describe('IsOnOrAfterInvoiceDateConstraint', () => {
  const constraint = new IsOnOrAfterInvoiceDateConstraint();

  it('passes when dueDate is after invoiceDate', () => {
    expect(constraint.validate('2026-07-02', argsFor('2026-07-01'))).toBe(true);
  });

  it('passes when dueDate equals invoiceDate', () => {
    expect(constraint.validate('2026-07-01', argsFor('2026-07-01'))).toBe(true);
  });

  it('fails when dueDate is before invoiceDate', () => {
    expect(constraint.validate('2026-06-30', argsFor('2026-07-01'))).toBe(false);
  });

  it('defers to other decorators when invoiceDate is missing/malformed', () => {
    expect(constraint.validate('2026-07-02', argsFor(undefined))).toBe(true);
    expect(constraint.validate('2026-07-02', argsFor('not-a-date'))).toBe(true);
  });

  it('exposes the exact spec error message', () => {
    expect(constraint.defaultMessage()).toBe('dueDate must be on or after invoiceDate');
  });
});
