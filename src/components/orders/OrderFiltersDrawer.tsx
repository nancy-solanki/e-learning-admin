import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Field, Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AsyncSelect } from '../ui/AsyncSelect';
import type { OrderFilters } from '../../api/services/orders';
import {
  listCouponOptions,
  listInstructorOptions,
  listRatingCourseOptions,
  listRatingUserOptions,
} from '../../api/services/options';

const defaultFilters: OrderFilters = { ordering: '-created_at' };

export function OrderFiltersDrawer({
  filters,
  onApply,
  onClose,
}: {
  filters: OrderFilters;
  onApply: (filters: OrderFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<OrderFilters>(filters);
  const update = (key: keyof OrderFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value || undefined }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({
      ...draft,
      course: draft.course?.trim() || undefined,
      user: draft.user?.trim() || undefined,
      instructor: draft.instructor?.trim() || undefined,
      coupon: draft.coupon?.trim() || undefined,
    });
  }
  return (
    <Drawer
      title="Filter orders"
      description="Narrow orders by status, people, course, amount, or date."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(defaultFilters)}>
            Reset filters
          </Button>
          <Button variant="primary" type="submit" form="order-filters">
            Apply filters
          </Button>
        </>
      }
    >
      <form id="order-filters" onSubmit={submit} className="grid gap-5">
        <Field label="Status" htmlFor="order-filter-status">
          <Select
            id="order-filter-status"
            label="Order status"
            value={draft.status ?? ''}
            onChange={(value) => update('status', value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'success', label: 'Success' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </Field>
        <Field label="Payment type" htmlFor="order-filter-free">
          <Select
            id="order-filter-free"
            label="Payment type"
            value={draft.is_free === undefined ? '' : String(draft.is_free)}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                is_free: value === '' ? undefined : value === 'true',
              }))
            }
            options={[
              { value: '', label: 'Paid and free' },
              { value: 'false', label: 'Paid' },
              { value: 'true', label: 'Free' },
            ]}
          />
        </Field>
        <Field label="Course" htmlFor="order-filter-course">
          <AsyncSelect
            id="order-filter-course"
            label="Course"
            value={draft.course ?? ''}
            onChange={(value) => update('course', value)}
            queryKey={['order-filter-options', 'courses']}
            loadOptions={listRatingCourseOptions}
            allLabel="All courses"
          />
        </Field>
        <Field label="User" htmlFor="order-filter-user">
          <AsyncSelect
            id="order-filter-user"
            label="User"
            value={draft.user ?? ''}
            onChange={(value) => update('user', value)}
            queryKey={['order-filter-options', 'users']}
            loadOptions={listRatingUserOptions}
            allLabel="All users"
          />
        </Field>
        <Field label="Instructor" htmlFor="order-filter-instructor">
          <AsyncSelect
            id="order-filter-instructor"
            label="Instructor"
            value={draft.instructor ?? ''}
            onChange={(value) => update('instructor', value)}
            queryKey={['order-filter-options', 'instructors']}
            loadOptions={listInstructorOptions}
            allLabel="All instructors"
          />
        </Field>
        <Field label="Coupon" htmlFor="order-filter-coupon">
          <AsyncSelect
            id="order-filter-coupon"
            label="Coupon"
            value={draft.coupon ?? ''}
            onChange={(value) => update('coupon', value)}
            queryKey={['order-filter-options', 'coupons']}
            loadOptions={listCouponOptions}
            allLabel="All coupons"
          />
        </Field>
        <Field label="Minimum total paid" htmlFor="order-filter-min">
          <Input
            id="order-filter-min"
            type="number"
            min="0"
            value={draft.total_paid_min ?? ''}
            onChange={(event) => update('total_paid_min', event.target.value)}
            placeholder="No minimum"
          />
        </Field>
        <Field label="Maximum total paid" htmlFor="order-filter-max">
          <Input
            id="order-filter-max"
            type="number"
            min="0"
            value={draft.total_paid_max ?? ''}
            onChange={(event) => update('total_paid_max', event.target.value)}
            placeholder="No maximum"
          />
        </Field>
        <Field label="Created after" htmlFor="order-filter-after">
          <Input
            id="order-filter-after"
            type="date"
            value={draft.created_at_after ?? ''}
            onChange={(event) => update('created_at_after', event.target.value)}
          />
        </Field>
        <Field label="Created before" htmlFor="order-filter-before">
          <Input
            id="order-filter-before"
            type="date"
            value={draft.created_at_before ?? ''}
            onChange={(event) =>
              update('created_at_before', event.target.value)
            }
          />
        </Field>
        <Field label="Sort by" htmlFor="order-filter-ordering">
          <Select
            id="order-filter-ordering"
            label="Order sorting"
            value={draft.ordering ?? '-created_at'}
            onChange={(value) => update('ordering', value)}
            options={[
              { value: '-created_at', label: 'Newest first' },
              { value: 'created_at', label: 'Oldest first' },
              { value: '-total_paid', label: 'Highest amount' },
              { value: 'total_paid', label: 'Lowest amount' },
            ]}
          />
        </Field>
      </form>
    </Drawer>
  );
}
