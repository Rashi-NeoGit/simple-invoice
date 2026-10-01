import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsOnOrAfterInvoiceDate } from '../validators/due-date.validator';

export class CustomerDto {
  @ApiProperty({ example: 'Paul Tan' })
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '947717364111' })
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional({ example: 'Singapore' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class InvoiceItemInputDto {
  @ApiProperty({ example: 'Consulting Services' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @IsPositive()
  rate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ type: InvoiceItemInputDto, description: 'Exactly one line item per spec §2.1.4' })
  @ValidateNested()
  @Type(() => InvoiceItemInputDto)
  item: InvoiceItemInputDto;

  @ApiProperty({ example: 'IV1001' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiPropertyOptional({ example: '#5721662' })
  @IsOptional()
  @IsString()
  invoiceReference?: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  invoiceDate: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  @IsOnOrAfterInvoiceDate()
  dueDate: string;

  @ApiProperty({ example: 'AUD', description: 'ISO 4217-style currency code' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({ example: 'Invoice for consulting work' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 10, description: 'Tax percentage; defaults to 10 if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    default: 0,
    description: 'Flat discount amount; defaults to 0 if omitted',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}
