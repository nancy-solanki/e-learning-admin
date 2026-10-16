import { Link } from 'react-router-dom';

import { AppLogo } from '../components/ui/AppLogo';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#fcfbff_0%,#fff_60%)] px-5 py-12 sm:px-6">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <AppLogo />
        <p className="mt-12 font-display text-8xl font-extrabold tracking-tight text-brand sm:text-9xl">
          404
        </p>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#69748c]">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-[49px] items-center justify-center rounded-lg bg-brand px-6 font-bold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
