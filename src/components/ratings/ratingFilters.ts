import type { RatingFilters } from '../../api/services/ratings';

export type RatingFilterValues = {
  course: string;
  user: string;
  rating: string;
  rating_min: string;
  rating_max: string;
  created_at_after: string;
  created_at_before: string;
  ordering: NonNullable<RatingFilters['ordering']>;
};

export const defaultRatingFilters: RatingFilterValues = {
  course: '',
  user: '',
  rating: '',
  rating_min: '',
  rating_max: '',
  created_at_after: '',
  created_at_before: '',
  ordering: '-created_at',
};

export function activeRatingFilterCount(filters: RatingFilterValues) {
  return (
    Object.entries(filters).filter(
      ([key, value]) => key !== 'ordering' && Boolean(value),
    ).length + (filters.ordering !== defaultRatingFilters.ordering ? 1 : 0)
  );
}
