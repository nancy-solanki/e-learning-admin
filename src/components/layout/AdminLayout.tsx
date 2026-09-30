import { signOut } from '../../api/services/auth';
import { Avatar } from '../ui/Avatar';
import { AccountDropdown } from '../ui/AccountDropdown';
import { adminNavigation, instructorNavigation } from '../../config/navigation';
import {
  HomeIcon,
  MenuIcon,
  FullscreenIcon,
  ArrowDownIcon,
} from '../../components/icons/AdminIcons';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearTokens, readTokens } from '../../state/session';
import { useCurrentUser } from '../../state/profile';
import { isAdmin } from '../../lib/permissions';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: profile } = useCurrentUser();
  const user = profile ?? null;
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    setLoggingOut(true);
    const tokens = readTokens();
    // Clear local state immediately, even if revocation is slow or unavailable.
    clearTokens();
    navigate('/auth/sign-in', { replace: true });
    try {
      if (tokens) await signOut(tokens);
    } catch {
      /* Local logout has already completed. */
    }
  };
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${isActive ? 'bg-[#635bce]/20 text-white' : 'text-[#bbc0d1] hover:bg-white/5 hover:text-white'}`;
  const navigation = isAdmin(user)
    ? adminNavigation
    : user?.role?.some(
          (role) => role.toLowerCase().replace(/^role_/, '') === 'instructor',
        )
      ? instructorNavigation
      : [];
  const pageTitle =
    location.pathname === '/coupons'
      ? 'Coupon management'
      : location.pathname === '/categories'
        ? 'Category management'
        : location.pathname === '/users'
          ? 'Users management'
          : location.pathname === '/profile'
            ? 'My profile'
            : 'Dashboard';
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError('Fullscreen is unavailable in this browser.');
    }
  };
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#101828]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}
      <aside
        id="admin-navigation"
        aria-label="Sidebar"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMenuOpen(false);
        }}
        className={`${menuOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-60 flex-col bg-[#242432] lg:flex`}
      >
        <NavLink
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex h-[70px] shrink-0 items-center gap-2.5 border-b border-white/5 px-5 text-base font-bold text-white"
        >
          <img src="/icons/favicon.svg" alt="" className="h-8 w-8" />
          Learninfy
        </NavLink>
        <nav
          aria-label="Main navigation"
          className="admin-scroll flex-1 overflow-y-auto px-3 py-5"
        >
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#777e96]">
            Main
          </p>
          <NavLink
            to="/"
            end
            className={linkClass}
            onClick={() => setMenuOpen(false)}
          >
            <HomeIcon className="h-[18px] w-[18px]" />
            Home
          </NavLink>
          {navigation.length > 0 && (
            <p className="mb-2 mt-6 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#777e96]">
              Management
            </p>
          )}
          {navigation.map(({ label, icon: Icon, path, submenu }) =>
            path ? (
              <NavLink
                key={label}
                to={path}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </NavLink>
            ) : submenu ? (
              <details key={label} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#bbc0d1] hover:bg-white/5">
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{label}</span>
                  <ArrowDownIcon className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="ml-9 border-l border-white/10 pl-3 pb-2">
                  {submenu.map((item) => (
                    <div key={item} className="py-2 text-xs text-[#9299b1]">
                      {item}
                    </div>
                  ))}
                  <span className="mt-1 inline-block rounded bg-white/5 px-2 py-1 text-[10px] text-[#9299b1]">
                    Coming soon
                  </span>
                </div>
              </details>
            ) : (
              <div
                key={label}
                aria-disabled="true"
                title="Coming soon"
                className="flex items-center gap-3 px-3 py-3 text-sm text-[#9299b1]"
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wide text-[#747b93]">
                  Soon
                </span>
              </div>
            ),
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-3 border-t border-white/5 p-4">
          <Avatar user={user} className="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {user?.username || user?.email || 'Your account'}
            </p>
            <p className="mt-1 text-[10px] text-[#9299b1]">
              {isAdmin(user) ? 'Administrator' : 'Member'}
            </p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between gap-3 border-b border-[#eef0f5] bg-white px-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-controls="admin-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-slate-500 lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">{pageTitle}</span>
            <span className="hidden text-xs text-slate-400 sm:block">
              Learninfy Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle fullscreen"
              onClick={() => void fullscreen()}
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-50 sm:block"
            >
              <FullscreenIcon className="h-4 w-4" />
            </button>
            <AccountDropdown
              user={user}
              loggingOut={loggingOut}
              onLogout={() => void logout()}
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8 sm:py-12">
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600"
            >
              {error}
            </p>
          )}
          <Outlet />
          <footer className="mt-12 text-center text-xs text-[#9ba3b5]">
            Learninfy · Learning, thoughtfully managed.
          </footer>
        </main>
      </div>
    </div>
  );
}
