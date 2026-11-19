import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '../../components/ui/PageHeading';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { FormNotice } from '../../components/ui/FormNotice';
import {
  listOrders,
  getOrder,
  type Order,
  type OrderFilters,
} from '../../api/services/orders';
import { OrderFiltersDrawer } from '../../components/orders/OrderFiltersDrawer';

const personName = (person: Order['user']) =>
  person.full_name ||
  [person.first_name, person.last_name].filter(Boolean).join(' ') ||
  person.username ||
  '—';
const dateLabel = (value: string) => new Date(value).toLocaleString();
const money = (value: number | string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function OrderDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: ({ signal }) => getOrder(id, signal),
  });
  const order = query.data;
  return (
    <Modal title="Order details" onClose={onClose}>
      {query.isPending ? (
        <p role="status" className="p-6 text-sm text-slate-500">
          Loading order…
        </p>
      ) : null}
      {query.isError ? (
        <div className="p-6">
          <FormNotice
            notice={{
              type: 'error',
              text: 'Unable to load this order. Please try again.',
            }}
          />
          <Button className="mt-3" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {order ? (
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          {[
            ['Order ID', order.id],
            ['Status', order.status],
            ['Total paid', order.is_free ? 'Free' : money(order.total_paid)],
            ['Admin commission', money(order.admin_commission)],
            ['Student', personName(order.user)],
            ['Instructor', personName(order.instructor)],
            ['Course', order.course?.title ?? '—'],
            ['Coupon', order.coupon?.code ?? '—'],
            ['Enrollment', order.enroll ?? '—'],
            ['Created', dateLabel(order.created_at)],
            ['Updated', dateLabel(order.updated_at)],
            ['Rejected reason', order.reject_reason ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm text-slate-800">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Modal>
  );
}

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({
    ordering: '-created_at',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const orders = useQuery({
    queryKey: ['orders', filterKey, page],
    queryFn: ({ signal }) => listOrders(filters, page, signal),
  });
  const filterCount = Object.entries(filters).filter(
    ([key, value]) =>
      value !== undefined && !(key === 'ordering' && value === '-created_at'),
  ).length;
  function clearFilters() {
    setFilters({ ordering: '-created_at' });
    setPage(1);
  }

  return (
    <section>
      <PageHeading
        title="Orders"
        description="Review purchases, payment status, and enrollment details."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Input
          aria-label="Search orders"
          className="min-w-56 flex-1"
          placeholder="Search order, course, user…"
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
            {filterCount > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                {filterCount}
              </span>
            )}
          </Button>
          <Button onClick={clearFilters} disabled={!filterCount}>
            Clear filters
          </Button>
        </div>
      </div>
      {filtersOpen && (
        <OrderFiltersDrawer
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
            setFiltersOpen(false);
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {orders.isError ? (
          <div className="p-6">
            <FormNotice
              notice={{
                type: 'error',
                text: 'Unable to load orders. Please try again.',
              }}
            />
            <Button className="mt-3" onClick={() => void orders.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}
        {orders.isPending ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Loading orders…
          </p>
        ) : null}
        {orders.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      'Order',
                      'Student',
                      'Course',
                      'Status',
                      'Total paid',
                      'Created',
                      '',
                    ].map((label) => (
                      <th key={label} className="px-5 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.data.results.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-medium" title={order.id}>
                        {order.id.slice(0, 8)}…
                      </td>
                      <td className="px-5 py-4">{personName(order.user)}</td>
                      <td className="max-w-56 truncate px-5 py-4">
                        {order.course?.title ?? '—'}
                      </td>
                      <td className="px-5 py-4 capitalize">{order.status}</td>
                      <td className="px-5 py-4">
                        {order.is_free ? 'Free' : money(order.total_paid)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {dateLabel(order.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          aria-label={`View order ${order.id}`}
                          onClick={() => setSelected(order.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!orders.data.results.length && (
              <div className="p-10 text-center">
                <h2 className="font-semibold">No orders found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Try changing or clearing your filters.
                </p>
              </div>
            )}
            <Pagination
              page={page}
              count={orders.data.count}
              visibleCount={orders.data.results.length}
              hasNext={!!orders.data.next}
              pending={orders.isPending}
              label="Order pagination"
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      {selected && (
        <OrderDetails id={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
