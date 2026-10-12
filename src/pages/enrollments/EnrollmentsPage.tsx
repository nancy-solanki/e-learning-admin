import { useEffect, useRef, useState } from 'react';
import {
  CloseIcon,
  EnrollmentIcon,
  SearchIcon,
} from '../../components/icons/AdminIcons';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

type Enrollment = {
  id: string;
  student: string;
  email: string;
  course: string;
  date: string;
  completed: number;
  lessons: number;
  status: 'In progress' | 'Completed' | 'Not started';
};
const courses = [
  'UI/UX Design: From idea to experience',
  'The complete modern web developer',
  'Data science with Python: The essentials',
];
const enrollments: Enrollment[] = [
  {
    id: 'ENR-1006',
    student: 'Emma Wilson',
    email: 'emma@example.com',
    course: courses[0],
    date: 'Oct 10, 2026',
    completed: 24,
    lessons: 32,
    status: 'In progress',
  },
  {
    id: 'ENR-1005',
    student: 'Liam Carter',
    email: 'liam@example.com',
    course: courses[1],
    date: 'Oct 9, 2026',
    completed: 0,
    lessons: 48,
    status: 'Not started',
  },
  {
    id: 'ENR-1004',
    student: 'Sophia Patel',
    email: 'sophia@example.com',
    course: courses[2],
    date: 'Oct 8, 2026',
    completed: 36,
    lessons: 36,
    status: 'Completed',
  },
  {
    id: 'ENR-1003',
    student: 'Noah Anderson',
    email: 'noah@example.com',
    course: courses[1],
    date: 'Oct 7, 2026',
    completed: 18,
    lessons: 48,
    status: 'In progress',
  },
  {
    id: 'ENR-1002',
    student: 'Isabella Chen',
    email: 'isabella@example.com',
    course: courses[0],
    date: 'Oct 5, 2026',
    completed: 32,
    lessons: 32,
    status: 'Completed',
  },
  {
    id: 'ENR-1001',
    student: 'Ethan Brooks',
    email: 'ethan@example.com',
    course: courses[2],
    date: 'Oct 3, 2026',
    completed: 9,
    lessons: 36,
    status: 'In progress',
  },
];
const secondary =
  'rounded-lg border border-[#e5e3ef] bg-white px-4 py-3 text-xs font-semibold text-[#665582] hover:bg-[#f5f1fa]';
function Progress({ entry }: { entry: Enrollment }) {
  const percent = Math.round((entry.completed / entry.lessons) * 100);
  return (
    <div className="min-w-28">
      <div className="mb-2 flex justify-between gap-3 text-xs text-[#74798b]">
        <span>
          {entry.completed}/{entry.lessons} lessons
        </span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${entry.student}'s course progress`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-[#eeeaf5]"
      >
        <div
          className={`h-full rounded-full ${percent === 100 ? 'bg-[#57a486]' : 'bg-[#9471d0]'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
function EnrollmentDialog({
  entry,
  onClose,
}: {
  entry: Enrollment;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="enrollment-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[min(500px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-6 text-[#202134] shadow-xl backdrop:bg-[#20203280]"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="enrollment-title" className="text-xl font-bold">
          Enrollment details
        </h2>
        <button onClick={onClose} aria-label="Close dialog">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <h3 className="font-bold">{entry.student}</h3>
      <p className="mt-1 text-sm text-[#858697]">{entry.email}</p>
      <p className="my-5 rounded-xl bg-[#f5f1fa] p-4 text-sm font-semibold leading-6 text-[#7563b5]">
        {entry.course}
      </p>
      <dl className="mb-6 grid grid-cols-2 gap-5 text-sm">
        {[
          ['Enrollment ID', entry.id],
          ['Enrolled on', entry.date],
          ['Status', entry.status],
          ['Access', 'Lifetime access'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="mb-1 text-xs text-[#858697]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <Progress entry={entry} />
      <p className="my-6 text-xs text-[#858697]">
        Sample enrollment · Static preview
      </p>
      <button className={`${secondary} w-full`} onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
export default function EnrollmentsPage() {
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const filtered = enrollments.filter(
    (entry) =>
      (!course || entry.course === course) &&
      (!status || entry.status === status) &&
      `${entry.student} ${entry.email} ${entry.course} ${entry.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const exportCsv = () => {
    const rows = [
      [
        'Enrollment ID',
        'Student',
        'Email',
        'Course',
        'Enrolled on',
        'Status',
        'Completed lessons',
        'Total lessons',
      ],
      ...filtered.map((e) => [
        e.id,
        e.student,
        e.email,
        e.course,
        e.date,
        e.status,
        String(e.completed),
        String(e.lessons),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-enrollments.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="text-[#202134] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#7054d8]">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            EVERY LEARNER. A NEW POSSIBILITY.
          </p>
          <h1 className="my-2 font-display text-4xl font-extrabold tracking-tight">
            Enrollments<span className="text-[#7961dc]">.</span>
          </h1>
          <p className="text-sm text-[#74798b]">
            Follow your students’ journeys, from their first lesson to their
            next milestone.
          </p>
        </div>
        <button className={secondary} onClick={exportCsv}>
          ↓ Export enrollments
        </button>
      </header>
      <div className="mb-6 flex items-center justify-between gap-6 rounded-2xl border border-[#e5dff4] bg-[#eee9f8] p-7 sm:p-9">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#7563b5]">
            LEARNING STARTS HERE
          </p>
          <h2 className="my-3 font-display text-3xl font-bold tracking-tight">
            A new chapter for every student.
          </h2>
          <p className="max-w-lg text-sm leading-6 text-[#756a8b]">
            See who’s learning, track their progress, and celebrate the courses
            they complete.
          </p>
        </div>
        <EnrollmentIcon
          aria-hidden="true"
          className="hidden size-24 shrink-0 text-[#9774d4] sm:block"
        />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Total enrollments', enrollments.length],
          ...['In progress', 'Completed', 'Not started'].map((value) => [
            value,
            enrollments.filter((e) => e.status === value).length,
          ]),
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[#e9e9f0] bg-white p-5"
          >
            <p className="text-xs text-[#77798a]">{label}</p>
            <strong className="mt-2 block text-3xl font-bold">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Student enrollments</h2>
        <span className="text-xs text-[#7b738c]">
          Sample data · Static preview
        </span>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-0 basis-full lg:flex-1">
          <SearchIcon
            aria-hidden="true"
            className="absolute left-3 top-3.5 size-4 text-[#9595a5]"
          />
          <Input
            className="pl-10!"
            aria-label="Search enrollments"
            placeholder="Search students, courses, or enrollment ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="min-w-40 flex-1 lg:max-w-64"
          label="Filter by course"
          value={course}
          onChange={setCourse}
          options={[
            { value: '', label: 'All courses' },
            ...courses.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          className="min-w-40 flex-1 lg:max-w-44"
          label="Enrollment status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All statuses' },
            ...['In progress', 'Completed', 'Not started'].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#e6e7ef] bg-white">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="sr-only">
            Sample student enrollments and course progress
          </caption>
          <thead className="border-b border-[#e9e9f0] bg-[#faf9fd] text-[#858697]">
            <tr>
              {[
                'Student',
                'Course',
                'Enrolled on',
                'Progress',
                'Status',
                'Details',
              ].map((label) => (
                <th scope="col" key={label} className="px-5 py-4 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-[#f0f0f5] last:border-0 hover:bg-[#fcfbff]"
              >
                <td className="px-5 py-5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eee9f8] text-xs font-bold text-[#8062bc]"
                    >
                      {entry.student
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                    <div>
                      <p className="whitespace-nowrap font-semibold">
                        {entry.student}
                      </p>
                      <p className="mt-1 text-[10px] text-[#858697]">
                        {entry.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-60 px-5 py-5">
                  <p className="font-semibold leading-5">{entry.course}</p>
                  <p className="mt-1 text-[10px] text-[#9595a5]">{entry.id}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-5 text-[#74798b]">
                  {entry.date}
                </td>
                <td className="px-5 py-5">
                  <Progress entry={entry} />
                </td>
                <td className="px-5 py-5">
                  <span
                    className={`whitespace-nowrap rounded-md px-2 py-1 ${entry.status === 'Completed' ? 'bg-[#edf7f1] text-[#39876a]' : entry.status === 'In progress' ? 'bg-[#f0eafa] text-[#8062bc]' : 'bg-[#f0f0f5] text-[#7b7e92]'}`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-5 py-5">
                  <button
                    className="whitespace-nowrap font-semibold text-[#8062bc]"
                    aria-label={`View enrollment ${entry.id}`}
                    onClick={() => setSelected(entry)}
                  >
                    View ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="p-10 text-center">
            <EnrollmentIcon className="mx-auto mb-3 size-9 text-[#a595ca]" />
            <h3 className="font-bold">No enrollments found</h3>
            <p className="my-3 text-sm text-[#78798b]">
              Try another search or adjust your filters.
            </p>
            <button
              className={secondary}
              onClick={() => {
                setSearch('');
                setCourse('');
                setStatus('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <p role="status" className="mt-5 text-center text-xs text-[#858697]">
        Showing {filtered.length} of {enrollments.length} enrollments
      </p>
      {selected && (
        <EnrollmentDialog entry={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
