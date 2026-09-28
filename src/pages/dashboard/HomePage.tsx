export default function HomePage() {
  return (
    <>
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#777f96]">
          Your workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to your dashboard
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
            Your dashboard is taking shape. Reports and insights will be
            available here soon. In the meantime, keep your account up to date
            and manage your community.
          </p>
        </div>
      </section>
    </>
  );
}
