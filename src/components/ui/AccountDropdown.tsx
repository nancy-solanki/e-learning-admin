import { Avatar } from './Avatar';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../../types/auth';
import { ArrowDownIcon, GearIcon } from '../icons/AdminIcons';

export function AccountDropdown({
  user,
  loggingOut,
  onLogout,
}: {
  user: User | null;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const expanded = open;
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-controls="account-menu"
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Avatar user={user} className="h-9 w-9 text-xs" />
        <span className="hidden max-w-40 truncate text-xs font-semibold text-slate-700 sm:block">
          {user?.username || user?.email || 'My account'}
        </span>
        <ArrowDownIcon
          className={`h-3.5 w-3.5 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div
          ref={menu}
          id="account-menu"
          role="menu"
          aria-label="Account"
          onKeyDown={(event) => {
            const items = Array.from(
              menu.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
              ) ?? [],
            );
            const index = items.indexOf(document.activeElement as HTMLElement);
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (index +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            }
          }}
          className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
        >
          <div
            role="presentation"
            className="mb-1 border-b border-slate-100 px-3 py-3"
          >
            <p className="truncate text-sm font-semibold">
              {user?.username || 'My account'}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {user?.email}
            </p>
          </div>
          <Link
            role="menuitem"
            to="/profile"
            aria-current={location.pathname === '/profile' ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
          >
            <GearIcon className="h-4 w-4" />
            Profile
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={loggingOut}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
