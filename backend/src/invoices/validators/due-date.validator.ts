import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsOnOrAfterInvoiceDate', async: false })
export class IsOnOrAfterInvoiceDateConstraint implements ValidatorConstraintInterface {
  validate(dueDate: string, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const invoiceDate = object.invoiceDate as string | undefined;

    // Let @IsDateString/@IsNotEmpty report the real error when either side is missing/malformed.
    if (!dueDate || !invoiceDate || isNaN(Date.parse(dueDate)) || isNaN(Date.parse(invoiceDate))) {
      return true;
    }

    return new Date(dueDate).getTime() >= new Date(invoiceDate).getTime();
  }

  defaultMessage(): string {
    return 'dueDate must be on or after invoiceDate';
  }
}

export function IsOnOrAfterInvoiceDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsOnOrAfterInvoiceDateConstraint,
    });
  };
}
