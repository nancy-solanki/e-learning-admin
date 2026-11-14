import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getWalletOverview } from '../../api/services/wallet';
import { useAccessState } from '../../state/access';
import { useInstructorDashboard } from '../../state/dashboard';
import type { DashboardCourse } from '../../api/services/dashboard';
import type { DashboardPeriod } from '../../api/services/dashboard';
import { formatMoney } from '../../lib/money';

const number = new Intl.NumberFormat();

function last30Days() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  const utcDate = (date: Date) => date.toISOString().slice(0, 10);
  return { start: utcDate(start), end: utcDate(end) };
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-[#ececf4] bg-white p-5 shadow-sm shadow-slate-200/30">
      <p className="text-sm font-medium text-[#778198]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#25243a]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#9299aa]">{hint}</p>
    </article>
  );
}

function CourseRow({ course }: { course: DashboardCourse }) {
  const status = course.status.replace('-', ' ');
  return (
    <Link
      to={`/courses/${encodeURIComponent(course.id)}/edit`}
      className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-[#f8f7fc]"
    >
      {course.thumbnail_url ? (
        <img
          src={course.thumbnail_url}
          alt=""
          className="h-14 w-20 rounded-lg object-cover"
        />
      ) : (
        <div className="grid h-14 w-20 place-items-center rounded-lg bg-[#f0edff] text-xs font-bold text-[#7054d8]">
          Course
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#29283d]">
          {course.title}
        </p>
        <p className="mt-1 text-xs capitalize text-[#8b92a5]">{status}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#39374d]">
          {number.format(course.student_count)}
        </p>
        <p className="mt-1 text-xs text-[#8b92a5]">students</p>
      </div>
      <div className="hidden min-w-14 text-right sm:block">
        <p className="text-sm font-semibold text-[#39374d]">
          {course.average_rating?.toFixed(1) ?? '—'}
        </p>
        <p className="mt-1 text-xs text-[#8b92a5]">rating</p>
      </div>
    </Link>
  );
}

const periodLabels: Record<DashboardPeriod, string> = {
  daily: 'Last 30 days',
  monthly: 'Last 12 months',
  yearly: 'Last 5 years',
};

function chartDate(date: string, period: DashboardPeriod) {
  if (period === 'yearly') return date;
  if (period === 'monthly') {
    const [year, month] = date.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'short',
      year: '2-digit',
    });
  }
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function safeMoney(value: number, currency: string) {
  if (!Number.isFinite(value)) return '';
  return formatMoney(value.toFixed(2), currency);
}

function TrendChart({
  values,
  color,
  formatValue,
  label,
  integer = false,
  period,
}: {
  values: { date: string; value: number }[];
  color: string;
  formatValue: (value: number) => string;
  label: string;
  integer?: boolean;
  period: DashboardPeriod;
}) {
  const gradientId = `chart-fill-${color.slice(1)}`;
  const chartValues = values.map((item) => ({
    ...item,
    dateLabel: chartDate(item.date, period),
  }));
  return (
    <div role="img" aria-label={label} className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartValues}
          margin={{ top: 12, right: 22, bottom: 4, left: 12 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#e9e8f2"
            strokeDasharray="4 5"
            vertical={false}
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#969caf', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={22}
            tickMargin={10}
          />
          <YAxis
            width={78}
            tick={{ fill: '#969caf', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickCount={3}
            allowDecimals={!integer}
            domain={[0, (max: number) => max || 1]}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
            contentStyle={{
              borderRadius: 10,
              borderColor: '#e7e7f0',
              fontSize: 12,
            }}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, fill: '#fff', stroke: color, strokeWidth: 2 }}
            dot={{ r: 3, fill: '#fff', stroke: color, strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function InstructorHome() {
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const dashboard = useInstructorDashboard(period);
  const { data: user } = useAccessState();
  const range = last30Days();
  const walletOverview = useQuery({
    queryKey: ['wallet-overview', user?.id, range.start, range.end],
    queryFn: ({ signal }) => getWalletOverview(range, signal),
  });
  const data = dashboard.data;
  const currency = data?.currency || walletOverview.data?.currency;
  const firstName = data?.instructor.first_name?.trim();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#777f96]">
            Instructor workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : 'Instructor dashboard'}
          </h1>
          <p className="mt-2 text-sm text-[#8792a8]">
            Track your courses, students, and learner feedback.
          </p>
        </div>
        <Link
          to="/courses/create"
          className="rounded-lg bg-[#7054d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5940b9]"
        >
          Create a course
        </Link>
      </div>

      {dashboard.isPending ? (
        <div
          role="status"
          className="rounded-2xl border border-[#ececf4] bg-white p-8 text-sm text-[#7b8498]"
        >
          Loading your instructor overview…
        </div>
      ) : dashboard.isError ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-6">
          <p role="alert" className="text-sm text-rose-700">
            Unable to load your dashboard. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void dashboard.refetch()}
            className="mt-3 text-sm font-semibold text-[#7054d8]"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          <section
            aria-label="Instructor metrics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Metric
              label="Published courses"
              value={number.format(data.metrics.published_courses)}
              hint="Courses available to learners"
            />
            <Metric
              label="Total students"
              value={number.format(data.metrics.total_students)}
              hint="Across all your courses"
            />
            <Metric
              label="Average rating"
              value={data.metrics.average_rating?.toFixed(1) ?? '—'}
              hint="Average learner rating"
            />
            <Metric
              label="New students"
              value={number.format(data.metrics.new_students_30d)}
              hint="Enrolled in the last 30 days"
            />
          </section>

          <section aria-label="Performance charts" className="mt-6 grid gap-6">
            <div className="flex justify-end">
              <div
                role="group"
                aria-label="Chart time range"
                className="inline-flex rounded-lg border border-[#e7e7f0] bg-white p-1"
              >
                {(['daily', 'monthly', 'yearly'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={period === option}
                    onClick={() => setPeriod(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${period === option ? 'bg-[#7054d8] text-white' : 'text-[#777f96] hover:bg-[#f5f3fc]'}`}
                  >
                    {option}
                  </button>
                ))}
                <span role="status" className="sr-only" aria-live="polite">
                  {dashboard.isFetching ? `Loading ${period} chart data` : ''}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e7e7f0] bg-white p-6">
              <div className="mb-3">
                <h2 className="font-bold text-[#29283d]">Student enrollment</h2>
                <p className="mt-1 text-xs text-[#9299aa]">
                  New students · {periodLabels[period]}
                </p>
              </div>
              {dashboard.isFetching && dashboard.isPlaceholderData ? (
                <p
                  role="status"
                  className="flex h-[220px] items-center justify-center text-sm text-[#7f879b]"
                >
                  Updating chart…
                </p>
              ) : data.enrollment_trend.length ? (
                <TrendChart
                  values={data.enrollment_trend.map((item) => ({
                    date: item.date,
                    value: item.count,
                  }))}
                  color="#7054d8"
                  formatValue={(value) => number.format(value)}
                  label="Daily student enrollments over the last 30 days"
                  integer
                  period={period}
                />
              ) : (
                <p className="flex h-[220px] items-center justify-center text-sm text-[#7f879b]">
                  No enrollment activity in this period.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-[#e7e7f0] bg-white p-6">
              <div className="mb-3">
                <h2 className="font-bold text-[#29283d]">Course earnings</h2>
                <p className="mt-1 text-xs text-[#9299aa]">
                  {periodLabels[period]} · wallet currency
                </p>
              </div>
              {dashboard.isFetching && dashboard.isPlaceholderData ? (
                <p
                  role="status"
                  className="flex h-[220px] items-center justify-center text-sm text-[#7f879b]"
                >
                  Updating chart…
                </p>
              ) : data.course_earnings.length && currency ? (
                <>
                  <div className="mb-1 flex justify-end">
                    <p className="text-sm font-bold text-[#29283d]">
                      {formatMoney(
                        data.course_earnings
                          .reduce(
                            (total, item) => total + Number(item.amount),
                            0,
                          )
                          .toFixed(2),
                        currency,
                      )}
                    </p>
                  </div>
                  <TrendChart
                    values={data.course_earnings.map((item) => ({
                      date: item.date,
                      value: Number(item.amount),
                    }))}
                    color="#21a67a"
                    formatValue={(value) => safeMoney(value, currency!)}
                    label="Daily course earnings over the last 30 days"
                    period={period}
                  />
                </>
              ) : data.course_earnings.length && walletOverview.isPending ? (
                <p
                  role="status"
                  className="flex h-[220px] items-center justify-center text-sm text-[#7f879b]"
                >
                  Loading wallet currency…
                </p>
              ) : data.course_earnings.length && walletOverview.isError ? (
                <div className="flex h-[220px] flex-col items-center justify-center text-center">
                  <p className="text-sm text-[#7f879b]">
                    Wallet currency is unavailable.
                  </p>
                  <button
                    type="button"
                    onClick={() => void walletOverview.refetch()}
                    className="mt-2 text-sm font-semibold text-[#7054d8]"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <p className="flex h-[220px] items-center justify-center text-sm text-[#7f879b]">
                  No earnings in this period.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-[#ececf4] bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#29283d]">Your courses</h2>
                  <p className="mt-1 text-xs text-[#9299aa]">
                    Most recently updated courses
                  </p>
                </div>
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-[#7054d8]"
                >
                  View all
                </Link>
              </div>
              {data.top_courses.length ? (
                <div className="divide-y divide-[#f0f0f5]">
                  {data.top_courses.map((course) => (
                    <CourseRow key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#faf9fd] p-5 text-sm text-[#7f879b]">
                  You haven’t created a course yet. Start with your first
                  course.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-[#ececf4] bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#29283d]">Recent ratings</h2>
                  <p className="mt-1 text-xs text-[#9299aa]">
                    Latest feedback from your students
                  </p>
                </div>
                <Link
                  to="/ratings"
                  className="text-xs font-semibold text-[#7054d8]"
                >
                  View all
                </Link>
              </div>
              {data.recent_ratings.length ? (
                <div className="space-y-3">
                  {data.recent_ratings.map((rating) => (
                    <article
                      key={rating.id}
                      className="rounded-xl bg-[#faf9fd] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[#37364b]">
                          {rating.student_name}
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-amber-600">
                          ★ {rating.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-[#8b92a5]">
                        {rating.course_title}
                      </p>
                      {rating.comment && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#656d80]">
                          {rating.comment}
                        </p>
                      )}
                      <time
                        dateTime={rating.created_at}
                        className="mt-2 block text-[11px] text-[#a0a6b4]"
                      >
                        {new Date(rating.created_at).toLocaleDateString()}
                      </time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#faf9fd] p-5 text-sm text-[#7f879b]">
                  No ratings yet. Student feedback will appear here.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

export default function HomePage() {
  const { isInstructor, data: user } = useAccessState();
  if (isInstructor) return <InstructorHome />;
  return (
    <>
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#777f96]">
          Your workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome{user?.first_name ? `, ${user.first_name}` : ''} to your
          dashboard
        </h1>
        <p className="mt-3 text-sm text-[#8792a8]">
          Everything you need to manage your learning community, in one place.
        </p>
      </div>
      <section className="relative overflow-hidden rounded-[24px] border border-[#e9e8f6] bg-white p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#f4f1ff]" />
        <div className="relative max-w-xl">
          <div className="mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-[#efebff]">
            <img src="/icons/favicon.svg" alt="" className="h-10 w-10" />
          </div>
          <span className="rounded-full bg-[#efecff] px-3 py-1 text-xs font-semibold text-[#6c55ff]">
            Learninfy administration
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            A little organization.
            <br />A lot of possibility.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#8792a8]">
            Manage your learning community from one place. Use the navigation to
            review courses, learners, and platform activity.
          </p>
        </div>
      </section>
    </>
  );
}
