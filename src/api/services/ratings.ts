import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type RatingRelation =
  | string
  | {
      id?: string;
      title?: string;
      full_name?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
      email?: string;
    }
  | null;

export type Rating = {
  id: string;
  course: RatingRelation;
  course_title: string | null;
  rating: number;
  comment: string | null;
  response: string | null;
  user: RatingRelation;
  created_at: string | null;
  updated_at: string | null;
};

export type RatingFilters = {
  page: number;
  course?: string;
  user?: string;
  rating?: string;
  rating_min?: string;
  rating_max?: string;
  created_at_after?: string;
  created_at_before?: string;
  search?: string;
  ordering?: 'created_at' | '-created_at' | 'rating' | '-rating';
};

export type RatingPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Rating[];
};

export type RatingUpdate = {
  comment?: string | null;
  response?: string | null;
};

export async function listRatings(
  filters: RatingFilters,
  signal?: AbortSignal,
): Promise<RatingPage> {
  return (
    await api.get<RatingPage>(ENDPOINTS.RATING.MANAGEMENT, {
      params: filters,
      signal,
    })
  ).data;
}

export async function getRating(id: string): Promise<Rating> {
  return (await api.get<Rating>(ENDPOINTS.RATING.DETAIL(id))).data;
}

export async function updateRating(
  id: string,
  update: RatingUpdate,
): Promise<Rating> {
  return (await api.patch<Rating>(ENDPOINTS.RATING.DETAIL(id), update)).data;
}

export async function deleteRating(id: string): Promise<void> {
  await api.delete(ENDPOINTS.RATING.DETAIL(id));
}
