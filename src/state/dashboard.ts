import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getInstructorDashboard,
  type DashboardPeriod,
} from '../api/services/dashboard';
import { queryKeys } from './queryClient';

export function useInstructorDashboard(period: DashboardPeriod) {
  return useQuery({
    queryKey: [...queryKeys.instructorDashboard, period],
    queryFn: ({ signal }) => getInstructorDashboard(period, signal),
    placeholderData: keepPreviousData,
  });
}
