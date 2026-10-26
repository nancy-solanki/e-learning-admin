import { useMutation, useQuery } from '@tanstack/react-query';
import * as ratingsApi from '../api/services/ratings';
import { queryClient, queryKeys } from './queryClient';

export function useRatings(filters: ratingsApi.RatingFilters) {
  return useQuery({
    queryKey: [...queryKeys.ratings, 'list', filters],
    queryFn: ({ signal }) => ratingsApi.listRatings(filters, signal),
  });
}

export function useRating(id: string) {
  return useQuery({
    queryKey: [...queryKeys.ratings, 'detail', id],
    queryFn: () => ratingsApi.getRating(id),
    enabled: Boolean(id),
  });
}

export function useRatingActions() {
  const update = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: ratingsApi.RatingUpdate;
    }) => ratingsApi.updateRating(id, values),
    onSuccess: (rating) => {
      queryClient.setQueryData(
        [...queryKeys.ratings, 'detail', rating.id],
        rating,
      );
      return queryClient.invalidateQueries({
        queryKey: [...queryKeys.ratings, 'list'],
      });
    },
  });
  const remove = useMutation({
    mutationFn: ratingsApi.deleteRating,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.ratings, 'list'],
      }),
  });

  return {
    updateRating: (id: string, values: ratingsApi.RatingUpdate) =>
      update.mutateAsync({ id, values }),
    deleteRating: remove.mutateAsync,
  };
}
