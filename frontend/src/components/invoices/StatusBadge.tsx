import { Chip } from '@mui/material';
import { InvoiceStatus } from '../../types/invoice';

const STATUS_COLOR: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'error'> = {
  Draft: 'default',
  Pending: 'info',
  Paid: 'success',
  Overdue: 'error',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Chip
      label={status}
      color={STATUS_COLOR[status]}
      size="small"
      variant={status === 'Draft' ? 'outlined' : 'filled'}
    />
  );
}
