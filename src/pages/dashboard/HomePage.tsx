import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  api,
  apiErrorMessage,
  authEndpoints,
  clearTokens,
  clearCurrentUser,
  getCurrentUser,
  readTokens,
} from '../../lib/api';
import type { User } from '../../types/auth';
import {
  ArrowDownIcon,
  BellIcon,
  ChevronRightIcon,
  FullscreenIcon,
  MenuIcon,
  SearchIcon,
} from '../../components/icons/AdminIcons';
import {
  adminNavigation,
  mainNavigation,
  instructorNavigation,
} from '../../config/navigation';

type HomePageProps = {
  children?: ReactNode;
};

const normalizeRoles = (roles: string[] | undefined) =>
  new Set(
    (roles ?? []).map((role) =>
      role
        .trim()
        .toLowerCase()
        .replace(/^role_/, ''),
    ),
  );

export default function HomePage({ children }: HomePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const roles = normalizeRoles(user?.role);
  const isAdministrator =
    roles.has('admin') ||
    roles.has('administrator') ||
    roles.has('staff') ||
    roles.has('superuser');
  const roleNavigation = isAdministrator
    ? adminNavigation
    : roles.has('instructor')
      ? instructorNavigation
      : [];
  const mainNav = mainNavigation.map((item) => ({ ...item, active: true }));
  const userNav = roleNavigation;
  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email ||
    'Profile';

  const loadProfile = async () => {
    setProfileError(null);
    try {
      setUser(await getCurrentUser());
    } catch (error: unknown) {
      setProfileError(apiErrorMessage(error, 'Unable to load your profile.'));
    }
  };

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch((error: unknown) => {
        if (active)
          setProfileError(
            apiErrorMessage(error, 'Unable to load your profile.'),
          );
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleProfile = () => {
    const nextOpen = !profileOpen;
    setProfileOpen(nextOpen);
    if (nextOpen) void loadProfile();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  const logout = async () => {
    setLoggingOut(true);

    try {
      const tokens = readTokens();
      if (tokens) {
        await api.post(authEndpoints.signOut, {
          refresh_token: tokens.refresh,
        });
      }
    } catch {
      // ignore logout failures and still clear client auth state
    } finally {
      clearTokens();
      clearCurrentUser();
      navigate('/auth/sign-in', { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fa] text-slate-800">
      <div className="flex min-h-screen">
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed inset-y-0 left-0 z-30 flex w-[260px] shrink-0 flex-col bg-[#171c2d] text-[#e4e8ff] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] transition-transform lg:static`}
        >
          <div className="flex h-[78px] items-center gap-3 border-b border-white/5 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#4332a0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
              <span className="font-display text-lg font-extrabold tracking-[-0.08em] text-white">
                L
              </span>
            </div>
            <div className="font-display text-[19px] font-extrabold tracking-[-0.06em] text-white">
              Learnify
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8fa7]">
              Main
            </div>
            <nav aria-label="Main navigation" className="space-y-1">
              {mainNav.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#2b2e4d] text-white shadow-[inset_0_0_0_1px_rgba(144,146,255,0.12)]'
                      : 'text-[#dfe4ff]/80 hover:bg-white/4 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="mb-3 mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8fa7]">
              User
            </div>
            <nav aria-label="Role navigation" className="space-y-1">
              {userNav.map(({ label, icon: Icon, submenu, path }) => {
                const isOpen = openMenu === label;
                const active = path ? location.pathname === path : false;

                return (
                  <div key={label}>
                    <button
                      type="button"
                      aria-expanded={submenu ? isOpen : undefined}
                      onClick={() =>
                        path
                          ? navigate(path)
                          : submenu && setOpenMenu(isOpen ? null : label)
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#2b2e4d] text-white shadow-[inset_0_0_0_1px_rgba(144,146,255,0.12)]'
                          : 'text-[#dfe4ff]/80 hover:bg-white/4 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </span>
                      {submenu ? (
                        isOpen ? (
                          <ArrowDownIcon className="h-4 w-4 text-[#b9bfd7]" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-[#b9bfd7]" />
                        )
                      ) : null}
                    </button>
                    {isOpen && submenu ? (
                      <div className="ml-11 space-y-1 py-1">
                        {submenu.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="block w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-[#9da6c8] transition-colors hover:bg-white/4 hover:text-white"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col bg-[#f5f6fa]">
          <header className="relative border-b border-[#e6e7ed] bg-white/90 backdrop-blur-sm">
            <div className="flex h-[90px] items-center gap-4 px-5 py-3 sm:px-6 lg:px-8">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9ebf5] bg-white text-[#5a6276] shadow-sm transition hover:border-[#dfe5f3] hover:text-slate-700"
              >
                <MenuIcon className="h-5 w-5" />
              </button>

              <div className="flex max-w-[780px] flex-1 items-center gap-3 rounded-2xl border border-[#dfe2ec] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(108,118,148,0.08)]">
                <SearchIcon className="h-5 w-5 text-[#71778d]" />
                <input
                  aria-label="Search"
                  className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-[#7d8599]"
                  placeholder="Search for anything here..."
                  type="search"
                />
              </div>

              <div className="ml-auto flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  aria-label="Toggle fullscreen"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9ebf5] bg-white text-[#4e5367] shadow-sm transition hover:border-[#dfe5f3] hover:text-slate-700"
                >
                  <FullscreenIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9ebf5] bg-white text-[#4e5367] shadow-sm transition hover:border-[#dfe5f3] hover:text-slate-700"
                >
                  <BellIcon className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5a60] ring-2 ring-white" />
                </button>
                {notificationsOpen ? (
                  <div className="absolute right-[150px] top-[74px] z-20 w-72 rounded-2xl border border-[#e8eaf2] bg-white p-4 text-sm shadow-xl">
                    <p className="font-semibold text-slate-800">
                      Notifications
                    </p>
                    <p className="mt-2 text-[#70778a]">
                      You are all caught up.
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={toggleProfile}
                  className="flex items-center gap-3 rounded-2xl border border-[#eae7f6] bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-[#d4c9f7]"
                >
                  <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_30%,#f4c0a4_0%,#d77d5c_35%,#8a5b45_100%)] text-[11px] font-bold text-white shadow-inner">
                    {user?.avatar?.url ? (
                      <img
                        src={user.avatar.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user?.first_name?.[0] ?? 'M') +
                      (user?.last_name?.[0] ?? 'J')
                    )}
                  </div>
                  <span className="hidden items-center gap-2 sm:flex">
                    <span className="text-sm font-semibold text-slate-700">
                      {displayName}
                    </span>
                    <ArrowDownIcon className="h-4 w-4 text-slate-400" />
                  </span>
                </button>
                {profileOpen ? (
                  <div className="absolute right-5 top-[74px] z-20 w-64 rounded-2xl border border-[#e8eaf2] bg-white p-4 shadow-xl">
                    <p className="font-semibold text-slate-800">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#70778a]">
                      {user?.email ||
                        profileError ||
                        'Profile details unavailable'}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="mt-4 w-full rounded-lg border border-[#e6e2fb] px-3 py-2 text-left text-sm font-semibold text-[#5f48d8]"
                    >
                      View profile
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      disabled={loggingOut}
                      className="mt-4 w-full rounded-lg bg-[#f4f2ff] px-3 py-2 text-left text-sm font-semibold text-[#5f48d8] disabled:opacity-60"
                    >
                      {loggingOut ? 'Logging out…' : 'Log out'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col bg-[#f5f6fa] px-5 py-6 sm:px-7 lg:px-8">
            {children ?? (
              <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(260px,0.8fr)]">
                <section className="rounded-[24px] border border-[#e8ebf4] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5bd5]">
                        Overview
                      </p>
                      <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.06em] text-slate-900">
                        Welcome back
                      </h1>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl bg-[#5f48d8] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(95,72,216,0.25)] transition hover:bg-[#533cc4]"
                    >
                      New report
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['Total Students', '12.8K'],
                      ['Active Courses', '184'],
                      ['Revenue', '$78.4K'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-[#edf0f7] bg-[#f9f9ff] p-4"
                      >
                        <p className="text-sm text-[#6d7384]">{label}</p>
                        <p className="mt-3 text-3xl font-bold tracking-[-0.06em] text-slate-900">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="rounded-[24px] border border-[#e8ebf4] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5bd5]">
                    Activity
                  </p>
                  <div className="mt-5 space-y-4">
                    {[
                      'New instructor approval queued',
                      'Course publication review due',
                      'Payout batch processed',
                    ].map((text, index) => (
                      <div
                        key={text}
                        className="flex items-start gap-3 rounded-xl bg-[#f7f7ff] p-3"
                      >
                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-[#5f48d8]' : index === 1 ? 'bg-[#f0b40d]' : 'bg-[#21b380]'}`}
                        />
                        <p className="text-sm leading-6 text-[#4d5366]">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </main>

          <footer className="flex items-center justify-center border-t border-[#ececf2] bg-white/80 px-5 py-4 text-center text-[14px] text-[#5d6477]">
            <span>
              Copyright © 2026{' '}
              <span className="font-semibold text-[#5845c7]">Vertix</span>.
              Designed with <span className="text-[#ff4f7b]">♥</span> by{' '}
              <span className="font-semibold text-[#5845c7]">Spruko</span> All
              rights reserved
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
