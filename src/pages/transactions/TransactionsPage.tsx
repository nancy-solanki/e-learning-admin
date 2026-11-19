import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '../../components/ui/PageHeading';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { TransactionFiltersDrawer } from '../../components/transactions/TransactionFiltersDrawer';
import {
  listTransactionWalletOptions,
  listTransactions,
  type TransactionFilters,
} from '../../api/services/transactions';
import { useAccessState } from '../../state/access';

const money = (value: number | string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const dateLabel = (value: string) => new Date(value).toLocaleString();
const userLabel = (user: string | { full_name?: string; username?: string }) =>
  typeof user === 'string' ? user : user.full_name || user.username || '—';

export default function TransactionsPage() {
  const { isAdmin } = useAccessState();
  const [filters, setFilters] = useState<TransactionFilters>({
    ordering: '-created_at',
  });
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: ({ signal }) => listTransactions(filters, page, signal),
  });
  const walletOptions = useQuery({
    queryKey: ['transaction-wallet-options'],
    queryFn: ({ signal }) => listTransactionWalletOptions(signal),
    enabled: isAdmin,
  });
  const data = query.data;
  const clear = () => {
    setFilters({ ordering: '-created_at' });
    setPage(1);
  };

  return (
    <section>
      <PageHeading
        title="All Payment Transactions"
        description="Review transaction activity across your accessible wallets."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Input
          aria-label="Search transactions"
          className="min-w-56 flex-1"
          placeholder="Search ID or description"
          value={filters.search ?? ''}
          onChange={(event) => {
            setFilters((current) => ({
              ...current,
              search: event.target.value || undefined,
            }));
            setPage(1);
          }}
        />
        <div className="flex gap-2">
          <Button
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
            {Object.keys(filters).filter((key) => key !== 'ordering').length >
              0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                {
                  Object.keys(filters).filter((key) => key !== 'ordering')
                    .length
                }
              </span>
            )}
          </Button>
          <Button
            onClick={clear}
            disabled={Object.keys(filters).every((key) => key === 'ordering')}
          >
            Clear filters
          </Button>
        </div>
      </div>
      {filtersOpen && (
        <TransactionFiltersDrawer
          filters={filters}
          wallets={walletOptions.data ?? []}
          showWalletFilter={isAdmin}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
            setFiltersOpen(false);
          }}
        />
      )}
      {query.isPending ? (
        <p
          role="status"
          className="rounded-xl bg-white p-8 text-center text-slate-500"
        >
          Loading transactions…
        </p>
      ) : null}
      {query.isError ? (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-red-700">
          <p role="alert">Unable to load transactions. Please try again.</p>
          <Button className="mt-3" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {data ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    'User',
                    'Transaction',
                    'Wallet',
                    'Type',
                    'Status',
                    'Amount',
                    'Created',
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{userLabel(item.user)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {item.description || '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.tx_id || item.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.wallet}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {item.transaction_type}
                    </td>
                    <td className="px-4 py-3 capitalize">{item.status}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {money(item.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {dateLabel(item.created_at)}
                    </td>
                  </tr>
                ))}
                {!data.results.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            count={data.count}
            visibleCount={data.results.length}
            hasNext={Boolean(data.next)}
            pending={query.isFetching}
            onPageChange={setPage}
            label="Transaction pagination"
          />
        </>
      ) : null}
    </section>
  );
}
