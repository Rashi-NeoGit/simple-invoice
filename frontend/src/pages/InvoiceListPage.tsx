import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { AppLayout } from '../components/layout/AppLayout';
import { InvoiceFilters, InvoiceFiltersValue } from '../components/invoices/InvoiceFilters';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceStatus, SortField, SortOrder } from '../types/invoice';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Search/filter/sort/page state lives in the URL query string (not component state),
 * so back/forward and bookmarking a filtered view both work correctly.
 */
export function InvoiceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE));
  // No default sort — the spec only requires invoiceDate/dueDate/totalAmount be
  // sortable when the user asks, not that the list start in any particular order.
  const sortBy = (searchParams.get('sortBy') as SortField | null) ?? undefined;
  const ordering = (searchParams.get('ordering') as SortOrder | null) ?? undefined;
  const status = (searchParams.get('status') as InvoiceStatus | null) ?? '';
  const keyword = searchParams.get('keyword') ?? '';
  const fromDate = searchParams.get('fromDate') ?? '';
  const toDate = searchParams.get('toDate') ?? '';

  const debouncedKeyword = useDebouncedValue(keyword, 400);

  const filtersValue: InvoiceFiltersValue = {
    keyword,
    status: status as InvoiceStatus | '',
    fromDate,
    toDate,
  };

  function updateParams(updates: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next, { replace: true });
  }

  const query = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      ordering,
      status: (status || undefined) as InvoiceStatus | undefined,
      keyword: debouncedKeyword || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [page, pageSize, sortBy, ordering, status, debouncedKeyword, fromDate, toDate],
  );

  const { data: invoices, paging, isLoading, error } = useInvoices(query);

  const handleFiltersChange = (next: InvoiceFiltersValue) => {
    updateParams({
      keyword: next.keyword,
      status: next.status,
      fromDate: next.fromDate,
      toDate: next.toDate,
      page: 1,
    });
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      updateParams({ ordering: ordering === 'ASC' ? 'DESC' : 'ASC' });
    } else {
      updateParams({ sortBy: field, ordering: 'ASC' });
    }
  };

  return (
    <AppLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h4" component="h1">
            Invoices
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/invoices/new')}
          >
            New Invoice
          </Button>
        </Stack>

        <InvoiceFilters value={filtersValue} onChange={handleFiltersChange} />

        {error && (
          <Box mb={2} color="error.main" role="alert">
            {error}
          </Box>
        )}

        <InvoiceTable
          invoices={invoices}
          paging={paging}
          isLoading={isLoading}
          sortBy={sortBy}
          ordering={ordering}
          onSortChange={handleSortChange}
          onPageChange={(nextPage) => updateParams({ page: nextPage })}
          onPageSizeChange={(nextSize) => updateParams({ pageSize: nextSize, page: 1 })}
          onRowClick={(id) => navigate(`/invoices/${id}`)}
        />
      </Container>
    </AppLayout>
  );
}
