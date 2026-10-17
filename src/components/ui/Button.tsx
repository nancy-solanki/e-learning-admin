import type { ButtonHTMLAttributes } from 'react';

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7054d8] disabled:cursor-not-allowed disabled:opacity-40 ${variant === 'primary' ? 'border-[#7054d8] bg-[#7054d8] text-white hover:bg-[#5940b9]' : 'border-[#e3e3ed] bg-white text-[#55566a] hover:bg-slate-50'} ${className}`}
      {...props}
    />
  );
}
