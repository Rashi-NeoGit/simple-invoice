import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import { InvoiceStatus } from '../../types/invoice';

describe('StatusBadge', () => {
  it.each<[InvoiceStatus, string]>([
    ['Draft', 'MuiChip-colorDefault'],
    ['Pending', 'MuiChip-colorInfo'],
    ['Paid', 'MuiChip-colorSuccess'],
    ['Overdue', 'MuiChip-colorError'],
  ])('renders the %s status with the correct color class', (status, expectedClass) => {
    render(<StatusBadge status={status} />);
    const chip = screen.getByText(status).closest('.MuiChip-root');
    expect(chip).toHaveClass(expectedClass);
  });

  it('renders Draft as outlined and other statuses as filled, distinguishing them visually', () => {
    const { rerender } = render(<StatusBadge status="Draft" />);
    expect(screen.getByText('Draft').closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');

    rerender(<StatusBadge status="Paid" />);
    expect(screen.getByText('Paid').closest('.MuiChip-root')).toHaveClass('MuiChip-filled');
  });
});
