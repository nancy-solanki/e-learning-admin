import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { AppLogo } from '../ui/AppLogo';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#fcfbff_0%,#fff_60%)] px-5 py-6 sm:px-6">
      <section className="w-full max-w-[448px] py-4">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2.5 border-0 bg-transparent text-sm text-[#6952ad]"
        >
          ← <span>Back to home</span>
        </Link>
        <AppLogo />
        <div className="my-9 mb-8">
          <h1 className="font-display text-[25px] font-bold tracking-[-.7px] text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[#69748c]">
            {subtitle}
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}
