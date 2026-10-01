import { memo } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { InvoiceStatus } from '../../types/invoice';

const STATUS_OPTIONS: Array<InvoiceStatus | ''> = ['', 'Draft', 'Pending', 'Paid', 'Overdue'];

export interface InvoiceFiltersValue {
  keyword: string;
  status: InvoiceStatus | '';
  fromDate: string;
  toDate: string;
}

interface InvoiceFiltersProps {
  value: InvoiceFiltersValue;
  onChange: (value: InvoiceFiltersValue) => void;
}

// Memoized so it doesn't re-render just because sibling table data refreshed while
// the filter values themselves (and the parent's onChange, now stable) didn't change.
function InvoiceFiltersComponent({ value, onChange }: InvoiceFiltersProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3 }}
      useFlexGap
      flexWrap="wrap"
    >
      <TextField
        label="Search invoice # or customer"
        value={value.keyword}
        onChange={(e) => onChange({ ...value, keyword: e.target.value })}
        size="small"
        sx={{ minWidth: 260 }}
        inputProps={{ 'aria-label': 'Search invoices by invoice number or customer name' }}
      />
      <TextField
        select
        label="Status"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as InvoiceStatus | '' })}
        size="small"
        sx={{ minWidth: 160 }}
      >
        {STATUS_OPTIONS.map((status) => (
          <MenuItem key={status || 'all'} value={status}>
            {status || 'All statuses'}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="From date"
        type="date"
        value={value.fromDate}
        onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
        size="small"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="To date"
        type="date"
        value={value.toDate}
        onChange={(e) => onChange({ ...value, toDate: e.target.value })}
        size="small"
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
}

export const InvoiceFilters = memo(InvoiceFiltersComponent);
