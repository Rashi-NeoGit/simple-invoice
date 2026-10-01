import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Invoice, PagingInfo, SortField, SortOrder } from '../../types/invoice';
import { StatusBadge } from './StatusBadge';

interface InvoiceTableProps {
  invoices: Invoice[];
  paging: PagingInfo;
  isLoading: boolean;
  sortBy?: SortField;
  ordering?: SortOrder;
  onSortChange: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (invoiceId: string) => void;
}

const SORTABLE_COLUMNS: Array<{ field: SortField; label: string }> = [
  { field: 'invoiceDate', label: 'Invoice Date' },
  { field: 'dueDate', label: 'Due Date' },
  { field: 'totalAmount', label: 'Total Amount' },
];

function formatAmount(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InvoiceTable({
  invoices,
  paging,
  isLoading,
  sortBy,
  ordering,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: InvoiceTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isLoading) {
    return (
      <Stack spacing={1} aria-label="Loading invoices" role="status">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  }

  if (invoices.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="body1" color="text.secondary">
          No invoices match your search or filters.
        </Typography>
      </Box>
    );
  }

  const pagination = (
    <TablePagination
      component="div"
      count={paging.total}
      page={paging.page - 1}
      onPageChange={(_event, newPage) => onPageChange(newPage + 1)}
      rowsPerPage={paging.pageSize}
      onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
      rowsPerPageOptions={[10, 20, 50]}
    />
  );

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {invoices.map((invoice) => (
          <Card
            key={invoice.invoiceId}
            onClick={() => onRowClick(invoice.invoiceId)}
            sx={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onRowClick(invoice.invoiceId);
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">{invoice.invoiceNumber}</Typography>
                <StatusBadge status={invoice.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {invoice.customer.fullname}
              </Typography>
              <Stack direction="row" justifyContent="space-between" mt={1}>
                <Typography variant="body2">Due {invoice.dueDate}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatAmount(invoice.totalAmount, invoice.currencySymbol)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {pagination}
      </Stack>
    );
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table aria-label="Invoice list">
        <TableHead>
          <TableRow>
            <TableCell>Invoice #</TableCell>
            <TableCell>Customer</TableCell>
            {SORTABLE_COLUMNS.map((column) => (
              <TableCell
                key={column.field}
                sortDirection={
                  sortBy === column.field
                    ? ((ordering ?? 'ASC').toLowerCase() as 'asc' | 'desc')
                    : false
                }
              >
                <TableSortLabel
                  active={sortBy === column.field}
                  direction={
                    sortBy === column.field ? (ordering === 'ASC' ? 'asc' : 'desc') : 'asc'
                  }
                  onClick={() => onSortChange(column.field)}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.invoiceId}
              hover
              onClick={() => onRowClick(invoice.invoiceId)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>{invoice.customer.fullname}</TableCell>
              <TableCell>{invoice.invoiceDate}</TableCell>
              <TableCell>{invoice.dueDate}</TableCell>
              <TableCell>{formatAmount(invoice.totalAmount, invoice.currencySymbol)}</TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination}
    </TableContainer>
  );
}
