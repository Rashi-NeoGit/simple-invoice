import { useCallback, useEffect, useState } from 'react';
import { fetchInvoices } from '../api/invoices.api';
import { Invoice, InvoiceListQuery, PagingInfo } from '../types/invoice';

export interface UseInvoicesResult {
  data: Invoice[];
  paging: PagingInfo;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvoices(query: InvoiceListQuery): UseInvoicesResult {
  const [data, setData] = useState<Invoice[]>([]);
  const [paging, setPaging] = useState<PagingInfo>({
    page: query.page,
    pageSize: query.pageSize,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stringified so identical filter/sort/page values don't trigger a refetch just
  // because the caller constructed a new object literal this render.
  const queryKey = JSON.stringify(query);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchInvoices(query)
      .then((result) => {
        setData(result.data);
        setPaging(result.paging);
      })
      .catch(() => setError('Failed to load invoices. Please try again.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, paging, isLoading, error, refetch: load };
}
