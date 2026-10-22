import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  BookIcon,
  CloseIcon,
  LayersIcon,
  LectureIcon,
} from '../../components/icons/AdminIcons';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { isAdmin } from '../../lib/permissions';
import { useCurrentUser } from '../../state/profile';

type Entry = {
  id: number;
  title: string;
  course: string;
  section: string;
  status: string;
  duration: number;
  lessons: number;
  description: string;
};
const courses = [
  'UI/UX Design: From idea to experience',
  'The complete modern web developer',
  'Data science with Python: The essentials',
];
const sections = [
  'Getting started',
  'Building the foundations',
  'Putting it into practice',
];
const statuses = ['Published', 'Draft', 'Pending', 'Approved', 'Rejected'];
const button =
  'rounded-lg bg-[#7054d8] px-4 py-3 text-xs font-semibold text-white hover:bg-[#5940b9]';
const secondary =
  'rounded-lg border border-[#e5e3ef] bg-white px-4 py-3 text-xs font-semibold text-[#665582] hover:bg-[#f5f1fa]';
const samples = (lecture: boolean): Entry[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: lecture
      ? [
          'Welcome to the course',
          'Understanding your users',
          'Your first HTML page',
          'Styling with CSS',
          'Exploring your first dataset',
          'From insight to action',
        ][i]
      : [
          'Getting started',
          'Research and discovery',
          'Building the foundations',
          'Responsive layouts',
          'Python essentials',
          'Putting it into practice',
        ][i],
    course: courses[Math.floor(i / 2)],
    section: sections[Math.floor(i / 2)],
    status: [
      'Published',
      'Published',
      'Draft',
      'Pending',
      'Approved',
      'Rejected',
    ][i],
    duration: [8, 24, 18, 32, 21, 16][i],
    lessons: [4, 6, 8, 5, 7, 3][i],
    description: lecture
      ? 'A practical lesson with clear examples to help students take their next step.'
      : 'Guide students through key concepts with a focused collection of lessons.',
  }));

function EntryDialog({
  entry,
  lecture,
  onClose,
  onSave,
}: {
  entry: Entry | null;
  lecture: boolean;
  onClose: () => void;
  onSave: (entry: Entry) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const noun = lecture ? 'lecture' : 'section';
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="entry-dialog-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[min(540px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-6 text-[#202134] shadow-xl backdrop:bg-[#20203280]"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="entry-dialog-title" className="text-xl font-bold">
          {entry ? 'Edit' : 'Add'} {noun}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close dialog">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const title = String(data.get('title')).trim();
          if (!title) return;
          onSave({
            id: entry?.id ?? Date.now(),
            title,
            course: String(data.get('course')),
            section: String(data.get('section') ?? ''),
            status: String(data.get('status') ?? 'Draft'),
            duration: Number(data.get('duration') ?? 0),
            lessons: entry?.lessons ?? 0,
            description: String(data.get('description')).trim(),
          });
        }}
      >
        <Field label="Title" htmlFor="entry-title" required>
          <Input
            id="entry-title"
            name="title"
            defaultValue={entry?.title}
            required
            maxLength={120}
            pattern=".*\S.*"
            placeholder={`Enter ${noun} title`}
          />
        </Field>
        <Field label="Course" htmlFor="entry-course">
          <select
            id="entry-course"
            name="course"
            className="ui-input"
            defaultValue={entry?.course}
          >
            {courses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {lecture && (
          <>
            <Field label="Section" htmlFor="entry-section">
              <select
                id="entry-section"
                name="section"
                className="ui-input"
                defaultValue={entry?.section}
              >
                {sections.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (minutes)" htmlFor="entry-duration">
                <Input
                  id="entry-duration"
                  name="duration"
                  type="number"
                  min="1"
                  max="600"
                  required
                  defaultValue={entry?.duration ?? 10}
                />
              </Field>
              <Field label="Status" htmlFor="entry-status">
                <select
                  id="entry-status"
                  name="status"
                  className="ui-input"
                  defaultValue={entry?.status ?? 'Draft'}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}
        <Field label="Description" htmlFor="entry-description">
          <Textarea
            id="entry-description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={entry?.description}
            placeholder="What will students learn?"
          />
        </Field>
        <p className="rounded-lg bg-[#f5f1fa] p-3 text-xs text-[#7e708f]">
          Static preview. Changes reset when you leave or refresh this page.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={secondary}>
            Cancel
          </button>
          <button className={button}>
            {entry ? 'Save changes' : `Add ${noun}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function CurriculumPage({
  kind,
}: {
  kind: 'sections' | 'lectures';
}) {
  const lecture = kind === 'lectures';
  const noun = lecture ? 'lecture' : 'section';
  const title = lecture ? 'Lectures' : 'Sections';
  const Icon = lecture ? LectureIcon : LayersIcon;
  const { data: user } = useCurrentUser();
  const [entries, setEntries] = useState(() => samples(lecture));
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [course, setCourse] = useState('');
  const [params, setParams] = useSearchParams();
  const status = lecture ? (params.get('status') ?? '') : '';
  const [dialog, setDialog] = useState<{ entry: Entry | null } | null>(null);
  const [notice, setNotice] = useState('');
  const allowed =
    isAdmin(user ?? null) ||
    user?.role?.some(
      (role) =>
        role
          .trim()
          .toLowerCase()
          .replace(/^role_/, '') === 'instructor',
    );
  if (!allowed) return <Navigate to="/" replace />;
  const filtered = entries.filter(
    (e) =>
      (!course || e.course === course) &&
      (!status || e.status === status) &&
      `${e.title} ${e.course} ${lecture ? e.section : ''}`
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()),
  );
  const reset = () => {
    setSearch('');
    setCourse('');
    setParams({});
  };
  return (
    <section className="text-[#202134] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#7054d8]">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            BUILD A BETTER LEARNING JOURNEY
          </p>
          <h1 className="my-2 font-display text-4xl font-extrabold tracking-tight">
            {title}
            <span className="text-[#7961dc]">.</span>
          </h1>
          <p className="text-sm text-[#74798b]">
            {lecture
              ? 'Small lessons. Lasting understanding. Manage every step of learning.'
              : 'Give your courses a clear structure, one chapter at a time.'}
          </p>
        </div>
        <button className={button} onClick={() => setDialog({ entry: null })}>
          ＋ Add {noun}
        </button>
      </header>
      <div className="mb-6 flex items-center justify-between gap-6 rounded-2xl border border-[#e5dff4] bg-[#eee9f8] p-7 sm:p-9">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#7563b5]">
            {lecture
              ? 'MAKE EVERY LESSON COUNT'
              : 'A LITTLE STRUCTURE. ENDLESS POSSIBILITY.'}
          </p>
          <h2 className="my-3 font-display text-3xl font-bold tracking-tight">
            {lecture
              ? 'Turn curiosity into confidence.'
              : 'Great learning starts with a clear path.'}
          </h2>
          <p className="max-w-lg text-sm leading-6 text-[#756a8b]">
            {lecture
              ? 'Bring your knowledge to life with focused lessons your students can follow at their own pace.'
              : 'Organize your ideas into thoughtful sections and help students see what comes next.'}
          </p>
        </div>
        <Icon
          aria-hidden="true"
          className="hidden size-24 shrink-0 text-[#9774d4] sm:block"
        />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [`Total ${kind}`, entries.length],
          ['Courses', new Set(entries.map((e) => e.course)).size],
          [
            lecture ? 'Published' : 'Total lectures',
            lecture
              ? entries.filter((e) => e.status === 'Published').length
              : entries.reduce((sum, e) => sum + e.lessons, 0),
          ],
          [
            lecture ? 'Learning minutes' : 'Empty sections',
            lecture
              ? entries.reduce((sum, e) => sum + e.duration, 0)
              : entries.filter((e) => !e.lessons).length,
          ],
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
        <h2 className="text-lg font-bold">Your {noun} library</h2>
        <span className="text-xs text-[#7b738c]">
          Sample data · Static preview
        </span>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-[#e7f5ed] p-3 text-sm text-[#327854]"
        >
          {notice}
        </p>
      )}
      {lecture && (
        <div
          className="mb-5 flex gap-5 overflow-x-auto border-b border-[#e5e5ef]"
          aria-label="Filter lectures by status"
        >
          {['', ...statuses].map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => setParams(s ? { status: s } : {})}
              className={`whitespace-nowrap border-b-2 pb-3 text-xs ${status === s ? 'border-[#7455c6] font-bold text-[#7455c6]' : 'border-transparent text-[#78798b]'}`}
            >
              {s || 'All lectures'}{' '}
              <span className="ml-1">
                {entries.filter((e) => !s || e.status === s).length}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label={`Search ${kind}`}
          placeholder={`Search ${kind} or courses…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter by course"
          className="ui-input sm:max-w-xs"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-col rounded-xl border border-[#e6e7ef] bg-white p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-xl bg-[#f3effb] p-3 text-[#8b6ccb]">
                <Icon className="size-5" />
              </span>
              <span
                className={`rounded-md px-2 py-1 text-xs ${lecture && entry.status === 'Published' ? 'bg-[#edf7f1] text-[#39876a]' : 'bg-[#f3f0f8] text-[#7b708f]'}`}
              >
                {lecture ? entry.status : `${entry.lessons} lectures`}
              </span>
            </div>
            <p className="flex items-start gap-2 text-xs leading-5 text-[#8c7d9d]">
              <BookIcon className="mt-0.5 size-4 shrink-0" />
              {entry.course}
            </p>
            <h3 className="my-3 text-base font-bold">{entry.title}</h3>
            <p className="mb-5 text-xs leading-6 text-[#74798b]">
              {entry.description}
            </p>
            <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[#f0f0f5] pt-4">
              <span className="text-xs text-[#858699]">
                {lecture
                  ? `${entry.duration} min · ${entry.section}`
                  : `Section ${entry.id > 6 ? '· New' : entry.id}`}
              </span>
              <button
                className="shrink-0 text-xs font-bold text-[#8062bc]"
                onClick={() => setDialog({ entry })}
              >
                Edit {noun} ↗
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="rounded-xl border border-dashed border-[#dcd5eb] p-10 text-center">
          <Icon className="mx-auto mb-3 size-9 text-[#a595ca]" />
          <h3 className="font-bold">No {kind} found</h3>
          <p className="my-3 text-sm text-[#78798b]">
            Try another search or adjust your filters.
          </p>
          <button className={secondary} onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
      <footer className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-[#858697]">
        <p role="status">
          Showing {filtered.length} of {entries.length} {kind}
        </p>
        <Link
          className="font-semibold text-[#8062bc]"
          to={lecture ? '/sections' : '/lectures'}
        >
          Explore {lecture ? 'sections' : 'lectures'} →
        </Link>
      </footer>
      {dialog && (
        <EntryDialog
          entry={dialog.entry}
          lecture={lecture}
          onClose={() => setDialog(null)}
          onSave={(entry) => {
            setEntries((items) =>
              dialog.entry
                ? items.map((item) => (item.id === entry.id ? entry : item))
                : [entry, ...items],
            );
            setNotice(
              `${title.slice(0, -1)} ${dialog.entry ? 'updated' : 'added'} in this preview. Changes are not saved to the server.`,
            );
            reset();
            setDialog(null);
          }}
        />
      )}
    </section>
  );
}
