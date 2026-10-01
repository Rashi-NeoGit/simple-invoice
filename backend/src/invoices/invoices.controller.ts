import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import {
  InvoiceSortField,
  InvoiceStatusFilter,
  ListInvoicesQueryDto,
  SortOrder,
} from './dto/list-invoices.query.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: InvoiceSortField })
  @ApiQuery({ name: 'ordering', required: false, enum: SortOrder })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatusFilter })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated invoice list: { data, paging }' })
  findAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Invoice detail' })
  @ApiResponse({ status: 400, description: 'Malformed invoice id' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: 201, description: 'Invoice created with status Draft' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Invoice number already exists' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.create(dto, user.id);
  }
}
