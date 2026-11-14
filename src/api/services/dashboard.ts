import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type DashboardCourse = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  status: 'published' | 'in-review' | 'approved' | 'draft' | 'rejected';
  student_count: number;
  average_rating: number | null;
  updated_at: string | null;
};

export type DashboardRating = {
  id: string;
  course_title: string;
  student_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type DashboardPeriod = 'daily' | 'monthly' | 'yearly';

export type InstructorDashboard = {
  instructor: { first_name: string };
  metrics: {
    published_courses: number;
    total_students: number;
    average_rating: number | null;
    new_students_30d: number;
  };
  enrollment_trend: { date: string; count: number }[];
  course_earnings: { date: string; amount: string }[];
  currency?: string | null;
  top_courses: DashboardCourse[];
  recent_ratings: DashboardRating[];
};

export async function getInstructorDashboard(
  period: DashboardPeriod,
  signal?: AbortSignal,
) {
  return (
    await api.get<InstructorDashboard>(ENDPOINTS.DASHBOARD.INSTRUCTOR, {
      params: { period },
      signal,
    })
  ).data;
}
