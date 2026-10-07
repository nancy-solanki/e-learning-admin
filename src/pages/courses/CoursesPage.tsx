import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BookIcon,
  SearchIcon,
  UsersIcon,
  StarIcon,
  CloseIcon,
} from '../../components/icons/AdminIcons';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { isAdmin } from '../../lib/permissions';
import { useCurrentUser } from '../../state/profile';

const courseThemes = {
  lavender: 'bg-[#e8e0f7] text-[#8562bf]',
  navy: 'bg-[#29374e] text-[#b7d6eb]',
  peach: 'bg-[#f8dfcc] text-[#bd714e]',
  mint: 'bg-[#dcede6] text-[#568c7b]',
  pink: 'bg-[#f2deea] text-[#b0658f]',
  sand: 'bg-[#eee6cf] text-[#97824c]',
};

type Course = {
  id: number;
  title: string;
  category: string;
  instructor: string;
  status: 'Published' | 'Draft' | 'In review';
  lessons: number;
  students: number;
  rating: string;
  price: number;
  theme: keyof typeof courseThemes;
  symbol: string;
  description: string;
};
const initialCourses: Course[] = [
  {
    id: 1,
    title: 'UI/UX Design: From idea to experience',
    category: 'Design',
    instructor: 'Olivia Bennett',
    status: 'Published',
    lessons: 32,
    students: 1248,
    rating: '4.9',
    price: 89,
    theme: 'lavender',
    symbol: 'Aa',
    description:
      'Build thoughtful digital experiences with user research, wireframes, and beautiful interfaces.',
  },
  {
    id: 2,
    title: 'The complete modern web developer',
    category: 'Development',
    instructor: 'Alex Morgan',
    status: 'Published',
    lessons: 48,
    students: 986,
    rating: '4.8',
    price: 129,
    theme: 'navy',
    symbol: '</>',
    description:
      'Turn your ideas into responsive websites. Learn the foundations of HTML, CSS, and JavaScript.',
  },
  {
    id: 3,
    title: 'Digital marketing that makes an impact',
    category: 'Marketing',
    instructor: 'Sophie Chen',
    status: 'In review',
    lessons: 24,
    students: 0,
    rating: '—',
    price: 79,
    theme: 'peach',
    symbol: '↗',
    description:
      'Connect with your audience through memorable content and a practical marketing strategy.',
  },
  {
    id: 4,
    title: 'Data science with Python: The essentials',
    category: 'Data science',
    instructor: 'James Wilson',
    status: 'Published',
    lessons: 36,
    students: 752,
    rating: '4.9',
    price: 99,
    theme: 'mint',
    symbol: '{ }',
    description:
      'Explore real datasets, uncover patterns, and tell compelling stories with data.',
  },
  {
    id: 5,
    title: 'Brand identity: Make your mark',
    category: 'Design',
    instructor: 'Olivia Bennett',
    status: 'Draft',
    lessons: 18,
    students: 0,
    rating: '—',
    price: 69,
    theme: 'pink',
    symbol: 'B.',
    description:
      'Create a distinctive visual identity, from your first sketch to a complete brand system.',
  },
  {
    id: 6,
    title: 'Build a business from the ground up',
    category: 'Business',
    instructor: 'Daniel Brooks',
    status: 'Published',
    lessons: 28,
    students: 564,
    rating: '4.7',
    price: 109,
    theme: 'sand',
    symbol: '↗',
    description:
      'Develop your idea, understand your customers, and build a sustainable business.',
  },
];
const categories = [
  'Design',
  'Development',
  'Marketing',
  'Data science',
  'Business',
];

function CourseDialog({
  course,
  onClose,
  onCreate,
}: {
  course: Course | null;
  onClose: () => void;
  onCreate: (course: Course) => void;
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
      className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[min(540px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-0 text-[#202134] shadow-[0_25px_80px_#19112630] backdrop:bg-[#20203280] backdrop:backdrop-blur-[4px] [&_button:focus-visible]:outline-3 [&_button:focus-visible]:outline-[#ad97e4] [&_button:focus-visible]:outline-offset-4"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="course-dialog-title"
    >
      <div className="flex items-start justify-between gap-5 border-b border-[#eceaf2] p-[25px] [&_h2]:mt-[7px] [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:leading-[1.4]">
        <div>
          <span className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            {course ? 'COURSE OVERVIEW' : 'SHARE WHAT YOU KNOW'}
          </span>
          <h2 id="course-dialog-title">
            {course ? course.title : 'A new learning journey'}
          </h2>
        </div>
        <button
          type="button"
          className="p-[5px] text-[#77798b] [&_svg]:size-5"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      {course ? (
        <div className="grid gap-5 p-6 [&>p]:text-[13px] [&>p]:leading-[1.8] [&>p]:text-[#74798b]">
          <div
            className={`relative isolate flex h-[157px] items-center justify-center overflow-hidden max-[520px]:h-[190px] [&>span]:z-1 [&>span]:-rotate-8 [&>span]:font-display [&>span]:text-[68px] [&>span]:font-extrabold [&>span]:tracking-[-6px] [&>small]:absolute [&>small]:left-4 [&>small]:bottom-[13px] [&>small]:text-[8px] [&>small]:font-bold [&>small]:uppercase [&>small]:tracking-[2px] before:absolute before:size-[135px] before:rotate-30 before:rounded-[25px] before:border before:border-current before:opacity-15 before:content-[''] ${courseThemes[course.theme]}`}
            aria-hidden="true"
          >
            <span>{course.symbol}</span>
            <small>{course.category}</small>
          </div>
          <p>{course.description}</p>
          <dl className="grid grid-cols-2 gap-4 [&_dt]:text-[11px] [&_dt]:text-[#858697] [&_dd]:mt-1 [&_dd]:text-[13px] [&_dd]:font-semibold">
            {[
              ['Instructor', course.instructor],
              ['Status', course.status],
              ['Lessons', String(course.lessons)],
              ['Price', `$${course.price}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-lg bg-[#f5f1fa] p-3 text-[11px]! text-[#7e708f]!">
            Sample course · Preview only
          </p>
          <button
            className="inline-flex items-center justify-center gap-3 rounded-[9px] border px-[19px] py-3 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none border-[#e3e3ed] bg-white text-[#55566a] hover:bg-slate-50"
            onClick={onClose}
          >
            Back to courses
          </button>
        </div>
      ) : (
        <form
          className="grid gap-5 p-6 [&>p]:text-[13px] [&>p]:leading-[1.8] [&>p]:text-[#74798b]"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const title = String(data.get('title')).trim();
            if (!title) return;
            onCreate({
              id: Date.now(),
              title,
              description: String(data.get('description')).trim(),
              category: String(data.get('category')),
              instructor: 'You',
              status: 'Draft',
              lessons: 0,
              students: 0,
              rating: '—',
              price: Number(data.get('price')),
              theme: 'lavender',
              symbol: 'Aa',
            });
          }}
        >
          <p>
            Start with the basics. Your new course will appear as a draft in
            this preview.
          </p>
          <Field label="Course title" htmlFor="course-title" required>
            <Input
              id="course-title"
              name="title"
              placeholder="e.g. Introduction to product design"
              required
              maxLength={120}
              pattern=".*\S.*"
            />
          </Field>
          <Field label="Description" htmlFor="course-description">
            <Textarea
              id="course-description"
              name="description"
              placeholder="What will your students learn?"
              maxLength={1000}
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-[15px] max-[520px]:grid-cols-1">
            <Field label="Category" htmlFor="course-category">
              <select className="ui-input" id="course-category" name="category">
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (USD)" htmlFor="course-price">
              <Input
                type="number"
                id="course-price"
                name="price"
                min="0"
                max="100000"
                step="0.01"
                defaultValue="0"
                required
              />
            </Field>
          </div>
          <p className="rounded-lg bg-[#f5f1fa] p-3 text-[11px]! text-[#7e708f]!">
            Static preview. Drafts reset when you leave or refresh this page.
          </p>
          <div className="flex justify-end gap-[10px]">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-3 rounded-[9px] border px-[19px] py-3 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none border-[#e3e3ed] bg-white text-[#55566a] hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="inline-flex items-center justify-center gap-3 rounded-[9px] border px-[19px] py-3 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none border-[#7054d8] bg-[#7054d8] text-white hover:bg-[#5940b9]">
              Create draft <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default function CoursesPage() {
  const { data: user } = useCurrentUser();
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All courses');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [dialog, setDialog] = useState<{ course: Course | null } | null>(null);
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
  const filtered = courses
    .filter(
      (course) =>
        (status === 'All courses' || course.status === status) &&
        (!category || course.category === category) &&
        `${course.title} ${course.instructor}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : sort === 'students'
          ? b.students - a.students
          : b.id - a.id,
    );
  const reset = () => {
    setSearch('');
    setCategory('');
    setStatus('All courses');
  };
  return (
    <section className="text-[#202134] [&_button:focus-visible]:outline-3 [&_button:focus-visible]:outline-[#ad97e4] [&_button:focus-visible]:outline-offset-4">
      <div className="mb-7 flex items-center justify-between gap-5 max-[520px]:items-start [&_h1]:my-[7px] [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-[-1.6px] max-[520px]:[&_h1]:text-3xl [&_h1_span]:text-[#7961dc] [&_p]:text-[13px] [&_p]:leading-[1.8] [&_p]:text-[#74798b] max-[520px]:[&_p]:max-w-[210px] max-[520px]:[&>button]:mt-6 max-[520px]:[&>button]:shrink-0 max-[520px]:[&>button]:gap-[5px] max-[520px]:[&>button]:p-[11px]">
        <div>
          <span className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            YOUR KNOWLEDGE. THEIR NEXT CHAPTER.
          </span>
          <h1>
            Courses<span>.</span>
          </h1>
          <p>A home for everything you teach. Make it extraordinary.</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-3 rounded-[9px] border px-[19px] py-3 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none border-[#7054d8] bg-[#7054d8] text-white hover:bg-[#5940b9]"
          onClick={() => setDialog({ course: null })}
        >
          <span aria-hidden="true">＋</span> Add course
        </button>
      </div>
      <div className="relative flex min-h-[260px] justify-between overflow-hidden rounded-2xl border border-[#e5dff4] bg-[#eee9f8] px-[38px] py-8 max-md:p-[25px] max-[520px]:min-h-[240px] [&_h2]:my-3 [&_h2]:font-display [&_h2]:text-4xl [&_h2]:font-extrabold [&_h2]:leading-[1.18] [&_h2]:tracking-[-1.3px] max-[520px]:[&_h2]:text-3xl [&_p]:text-xs [&_p]:text-[#756a8b] max-[520px]:[&_p]:max-w-[190px] [&_button]:mt-5 [&_button]:text-xs [&_button]:font-bold [&_button]:text-[#6241b4] [&_button_span]:ml-[18px] [&>div:first-child]:z-1">
        <div>
          <span className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            MADE TO INSPIRE
          </span>
          <h2>
            Big ideas.
            <br />
            Brighter futures.
          </h2>
          <p>Create learning experiences that open new doors.</p>
          <button onClick={() => setDialog({ course: null })}>
            Start a new course <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div
          className="relative w-[310px] shrink-0 max-md:w-[200px] max-[520px]:pointer-events-none max-[520px]:absolute max-[520px]:-right-[68px] max-[520px]:top-[46px] max-[520px]:scale-65 max-[520px]:opacity-60"
          aria-hidden="true"
        >
          <div className="absolute -top-6 left-[6px] size-[270px] rounded-full border border-[#d6c9eb] after:absolute after:inset-[23px] after:rounded-full after:border after:border-dashed after:border-[#d6c9eb] after:content-[''] max-md:-left-[30px]" />
          <div className="absolute left-[62px] top-[2px] h-[210px] w-[180px] -rotate-9 rounded-[13px] border border-white bg-[#fffdf7] p-[22px] shadow-[0_15px_35px_#69549918] max-md:left-5 [&>svg]:mb-[15px] [&>svg]:size-7 [&>svg]:text-[#7657bc] [&>span]:block [&>span]:text-[10px] [&>span]:text-[#8b7ba4] [&_strong]:mt-[6px] [&_strong]:block [&_strong]:font-display [&_strong]:text-[22px] [&_strong]:leading-[1.2]">
            <BookIcon />
            <span>A little curiosity.</span>
            <strong>
              Endless
              <br />
              possibility.
            </strong>
            <div className="mt-[15px] flex gap-1 [&_i]:h-1 [&_i]:w-[30px] [&_i]:rounded-[3px] [&_i]:bg-[#dcd1ee] [&_i:first-child]:bg-[#9471d0]">
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="absolute right-[18px] top-1 text-[68px] text-[#9774d4] max-md:-right-5">
            ✳
          </span>
          <span className="absolute -bottom-3 right-0 -rotate-9 rounded-[5px] border border-[#ded3ec] bg-[#f7f2fc] p-3 text-[8px] tracking-[1.3px] text-[#7e6d96] max-md:hidden">
            THE NEXT CHAPTER IS YOURS
          </span>
        </div>
      </div>
      <div className="mt-6 mb-[35px] grid grid-cols-4 rounded-xl border border-[#e9e9f0] bg-white py-[22px] max-md:grid-cols-2 max-md:gap-y-5">
        {[
          {
            label: 'Total courses',
            value: courses.length,
            icon: BookIcon,
            detail: 'Ideas brought to life',
          },
          {
            label: 'Published',
            value: courses.filter((c) => c.status === 'Published').length,
            icon: BookIcon,
            detail: 'Ready for curious minds',
          },
          {
            label: 'Total students',
            value: courses
              .reduce((sum, c) => sum + c.students, 0)
              .toLocaleString('en-US'),
            icon: UsersIcon,
            detail: 'Learning something new',
          },
          {
            label: 'Average rating',
            value: '4.8',
            icon: StarIcon,
            detail: 'From sample course ratings',
          },
        ].map(({ label, value, icon: Icon, detail }) => (
          <div
            className="flex gap-3 border-r border-[#eeeef4] px-5 last:border-0 max-md:[&:nth-child(2)]:border-0 min-[1024px]:max-[1200px]:gap-2 min-[1024px]:max-[1200px]:px-3 max-[520px]:gap-2 max-[520px]:px-[13px] [&_div>span]:text-[11px] [&_div>span]:text-[#77798a] [&_strong]:my-[3px] [&_strong]:block [&_strong]:text-[25px] [&_strong]:font-bold [&_strong]:tracking-[-0.7px] [&_small]:block [&_small]:text-[9px] [&_small]:text-[#828696] max-[520px]:[&_small]:text-[8px]"
            key={label}
          >
            <span className="h-[35px] rounded-[10px] bg-[#f3effb] p-[9px] text-[#8b6ccb] [&_svg]:size-[17px] min-[1024px]:max-[1200px]:hidden">
              <Icon />
            </span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-5 flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-[-0.4px] [&_h2_span]:ml-2 [&_h2_span]:inline-block [&_h2_span]:rounded-md [&_h2_span]:bg-[#eae5f8] [&_h2_span]:px-[7px] [&_h2_span]:py-[2px] [&_h2_span]:align-middle [&_h2_span]:text-[11px] [&_h2_span]:text-[#8061be]">
        <h2>
          Your course library <span>{courses.length}</span>
        </h2>
        <span className="text-[10px] text-[#7b738c]">
          Sample data · Static preview
        </span>
      </div>
      {notice && (
        <div
          className="mb-[15px] flex justify-between gap-3 rounded-lg bg-[#e7f5ed] p-[13px] text-xs text-[#327854] [&_svg]:size-4"
          role="status"
        >
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <CloseIcon />
          </button>
        </div>
      )}
      <div
        className="flex gap-[25px] overflow-x-auto border-b border-[#e5e5ef] max-[520px]:gap-[18px] [&_button]:flex [&_button]:items-center [&_button]:gap-2 [&_button]:whitespace-nowrap [&_button]:border-b-2 [&_button]:pb-[14px] [&_button]:text-xs max-[520px]:[&_button]:text-[11px] [&_button_span]:rounded-[5px] [&_button_span]:px-[6px] [&_button_span]:py-[2px] [&_button_span]:text-[9px]"
        aria-label="Filter courses by status"
      >
        {['All courses', 'Published', 'Draft', 'In review'].map((tab) => (
          <button
            key={tab}
            aria-pressed={status === tab}
            onClick={() => setStatus(tab)}
            className={
              status === tab
                ? 'border-[#7455c6] font-bold text-[#7455c6] [&_span]:bg-[#eae2fa]'
                : 'border-transparent text-[#78798b] [&_span]:bg-[#eaeaf1]'
            }
          >
            {tab}
            <span>
              {tab === 'All courses'
                ? courses.length
                : courses.filter((c) => c.status === tab).length}
            </span>
          </button>
        ))}
      </div>
      <div className="my-5 flex gap-3 max-md:flex-wrap">
        <div className="relative flex-1 max-md:basis-full [&>svg]:absolute [&>svg]:left-[13px] [&>svg]:top-[14px] [&>svg]:size-4 [&>svg]:text-[#9595a5] [&_input]:pl-[38px]!">
          <SearchIcon />
          <Input
            aria-label="Search courses"
            placeholder="Search courses or instructors…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          className="w-[165px] max-md:w-auto max-md:flex-1"
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          className="w-[165px] max-md:w-auto max-md:flex-1"
          label="Sort courses"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'title', label: 'Title: A–Z' },
            { value: 'students', label: 'Most students' },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-5 min-[1024px]:max-[1200px]:grid-cols-2 max-md:grid-cols-2 max-[520px]:grid-cols-1">
        {filtered.map((course) => (
          <article
            className="overflow-hidden rounded-xl border border-[#e6e7ef] bg-white transition-[box-shadow,transform] duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_#2820390a] motion-reduce:transition-none motion-reduce:hover:transform-none [&_h3]:my-[11px] [&_h3]:min-h-12 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:leading-[1.6] [&_h3_button]:text-left [&_h3_button:hover]:text-[#7054d8] [&_footer]:flex [&_footer]:items-center [&_footer]:justify-between [&_footer]:border-t [&_footer]:border-[#f0f0f5] [&_footer]:py-[14px] [&_footer_strong]:text-[17px] [&_footer_strong]:font-bold [&_footer_small]:text-[8px] [&_footer_small]:font-normal [&_footer_small]:text-[#9596a5] [&_footer_button]:text-[10px] [&_footer_button]:font-bold [&_footer_button]:text-[#8062bc] [&_footer_button_span]:ml-2"
            key={course.id}
          >
            <div
              className={`relative isolate flex h-[157px] items-center justify-center overflow-hidden max-[520px]:h-[190px] [&>span]:z-1 [&>span]:-rotate-8 [&>span]:font-display [&>span]:text-[68px] [&>span]:font-extrabold [&>span]:tracking-[-6px] [&>small]:absolute [&>small]:left-4 [&>small]:bottom-[13px] [&>small]:text-[8px] [&>small]:font-bold [&>small]:uppercase [&>small]:tracking-[2px] before:absolute before:size-[135px] before:rotate-30 before:rounded-[25px] before:border before:border-current before:opacity-15 before:content-[''] ${courseThemes[course.theme]}`}
              aria-hidden="true"
            >
              <span>{course.symbol}</span>
              <small>{course.category}</small>
              <div className="absolute -right-[35px] -top-[35px] size-[145px] rounded-full border-[26px] border-current opacity-[0.07]" />
            </div>
            <div className="px-[18px] pt-[17px]">
              <div className="flex items-center justify-between gap-1 text-[9px] text-[#8c7d9d]">
                <span>{course.category}</span>
                <span
                  className={`rounded-[5px] px-[7px] py-1 text-[9px] ${course.status === 'Published' ? 'text-[#39876a] bg-[#edf7f1]' : course.status === 'Draft' ? 'text-[#7b7e92] bg-[#f0f0f5]' : 'text-[#a07c2d] bg-[#fcf5df]'}`}
                >
                  {course.status}
                </span>
              </div>
              <h3>
                <button onClick={() => setDialog({ course })}>
                  {course.title}
                </button>
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-[#77798c] [&>span]:grid [&>span]:size-6 [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[#eee9e5] [&>span]:text-[8px] [&>span]:text-[#8b7666]">
                <span aria-hidden="true">
                  {course.instructor
                    .split(' ')
                    .map((name) => name[0])
                    .join('')}
                </span>
                {course.instructor}
              </div>
              <div className="my-[17px] flex justify-between gap-[6px] text-[9px] text-[#858699] [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_svg]:size-3 [&>span:last-child_svg]:text-[#ccaa56]">
                <span>
                  <BookIcon />
                  {course.lessons} lessons
                </span>
                <span>
                  <UsersIcon />
                  {course.students.toLocaleString('en-US')} students
                </span>
                <span>
                  <StarIcon />
                  {course.rating}
                </span>
              </div>
              <footer>
                <strong>
                  ${course.price}
                  <small> USD</small>
                </strong>
                <button onClick={() => setDialog({ course })}>
                  View course <span aria-hidden="true">↗</span>
                </button>
              </footer>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="px-5 py-[50px] text-center [&>svg]:mx-auto [&>svg]:mb-[14px] [&>svg]:size-10 [&>svg]:text-[#a595ca] [&_h3]:font-bold [&_p]:mt-[10px] [&_p]:mb-5 [&_p]:text-[13px] [&_p]:text-[#78798b]">
          <BookIcon />
          <h3>No courses found</h3>
          <p>Try another search or adjust your filters.</p>
          <button
            className="inline-flex items-center justify-center gap-3 rounded-[9px] border px-[19px] py-3 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none border-[#e3e3ed] bg-white text-[#55566a] hover:bg-slate-50"
            onClick={reset}
          >
            Clear filters
          </button>
        </div>
      )}
      <p className="mt-6 text-center text-[11px] text-[#858697]" role="status">
        Showing {filtered.length} of {courses.length} courses
      </p>
      {dialog && (
        <CourseDialog
          course={dialog.course}
          onClose={() => setDialog(null)}
          onCreate={(course) => {
            setCourses((items) => [course, ...items]);
            reset();
            setSort('newest');
            setNotice(
              `“${course.title}” added as a preview draft. It is not saved to the server.`,
            );
            setDialog(null);
          }}
        />
      )}
    </section>
  );
}
