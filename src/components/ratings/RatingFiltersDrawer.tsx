import { useState, type FormEvent } from 'react';
import { AsyncSelect } from '../ui/AsyncSelect';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Field, Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { defaultRatingFilters, type RatingFilterValues } from './ratingFilters';
import {
  listRatingCourseOptions,
  listRatingUserOptions,
} from '../../api/services/options';

export function RatingFiltersDrawer({
  filters,
  onApply,
  onClose,
}: {
  filters: RatingFilterValues;
  onApply: (filters: RatingFilterValues) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const update = (name: keyof RatingFilterValues, value: string) =>
    setDraft((current) => ({ ...current, [name]: value }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({
      ...draft,
      course: draft.course.trim(),
      user: draft.user.trim(),
      rating: draft.rating.trim(),
      rating_min: draft.rating_min.trim(),
      rating_max: draft.rating_max.trim(),
    });
  }

  return (
    <Drawer
      title="Filter ratings"
      description="Narrow ratings by course, reviewer, score, or date."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(defaultRatingFilters)}>
            Reset filters
          </Button>
          <Button variant="primary" type="submit" form="rating-filters">
            Apply filters
          </Button>
        </>
      }
    >
      <form id="rating-filters" onSubmit={submit} className="grid gap-5">
        <Field label="Course" htmlFor="rating-filter-course">
          <AsyncSelect
            id="rating-filter-course"
            label="Course"
            value={draft.course}
            onChange={(value) => update('course', value)}
            queryKey={['rating-filter-options', 'courses']}
            loadOptions={listRatingCourseOptions}
            allLabel="All courses"
          />
        </Field>
        <Field label="Reviewer" htmlFor="rating-filter-user">
          <AsyncSelect
            id="rating-filter-user"
            label="Reviewer"
            value={draft.user}
            onChange={(value) => update('user', value)}
            queryKey={['rating-filter-options', 'reviewers']}
            loadOptions={listRatingUserOptions}
            allLabel="All reviewers"
          />
        </Field>
        <Field label="Exact rating" htmlFor="rating-filter-score">
          <Input
            id="rating-filter-score"
            aria-label="Filter by exact rating"
            type="number"
            step="any"
            value={draft.rating}
            onChange={(event) => update('rating', event.target.value)}
            placeholder="Any score"
          />
        </Field>
        <Field label="Minimum rating" htmlFor="rating-filter-min">
          <Input
            id="rating-filter-min"
            aria-label="Filter by minimum rating"
            type="number"
            step="any"
            value={draft.rating_min}
            onChange={(event) => update('rating_min', event.target.value)}
            placeholder="No minimum"
          />
        </Field>
        <Field label="Maximum rating" htmlFor="rating-filter-max">
          <Input
            id="rating-filter-max"
            aria-label="Filter by maximum rating"
            type="number"
            step="any"
            value={draft.rating_max}
            onChange={(event) => update('rating_max', event.target.value)}
            placeholder="No maximum"
          />
        </Field>
        <Field label="Created after" htmlFor="rating-filter-created-after">
          <Input
            id="rating-filter-created-after"
            aria-label="Filter ratings created after"
            type="date"
            value={draft.created_at_after}
            onChange={(event) => update('created_at_after', event.target.value)}
          />
        </Field>
        <Field label="Created before" htmlFor="rating-filter-created-before">
          <Input
            id="rating-filter-created-before"
            aria-label="Filter ratings created before"
            type="date"
            value={draft.created_at_before}
            onChange={(event) =>
              update('created_at_before', event.target.value)
            }
          />
        </Field>
        <Field label="Sort by" htmlFor="rating-filter-ordering">
          <Select
            id="rating-filter-ordering"
            label="Sort ratings"
            value={draft.ordering}
            onChange={(value) => {
              if (
                value === 'created_at' ||
                value === '-created_at' ||
                value === 'rating' ||
                value === '-rating'
              )
                update('ordering', value);
            }}
            options={[
              { value: '-created_at', label: 'Newest first' },
              { value: 'created_at', label: 'Oldest first' },
              { value: '-rating', label: 'Highest rating' },
              { value: 'rating', label: 'Lowest rating' },
            ]}
          />
        </Field>
      </form>
    </Drawer>
  );
}
