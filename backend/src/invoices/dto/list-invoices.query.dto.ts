import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum InvoiceSortField {
  INVOICE_DATE = 'invoiceDate',
  DUE_DATE = 'dueDate',
  TOTAL_AMOUNT = 'totalAmount',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum InvoiceStatusFilter {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
}

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Records per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: InvoiceSortField })
  @IsOptional()
  @IsIn(Object.values(InvoiceSortField))
  sortBy?: InvoiceSortField;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsIn(Object.values(SortOrder))
  ordering?: SortOrder;

  @ApiPropertyOptional({ enum: InvoiceStatusFilter })
  @IsOptional()
  @IsIn(Object.values(InvoiceStatusFilter))
  status?: InvoiceStatusFilter;

  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on invoice number or customer name',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter invoices on/after this invoice date',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filter invoices on/before this invoice date',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
