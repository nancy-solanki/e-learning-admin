import type { ReactNode } from 'react';

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
