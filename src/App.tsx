import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  subscribeAuth,
  sessionTabId,
  getSessionUser,
  setSessionUser,
  removeLegacyAuth,
} from './state/session';
import axios from 'axios';
import { getCurrentUser } from './state/profile';
import { isAdmin } from './lib/permissions';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignInPage from './pages/auth/SignInPage';
import HomePage from './pages/dashboard/HomePage';
import AdminLayout from './components/layout/AdminLayout';
import ProfilePage from './pages/profile/ProfilePage';
import UsersPage from './pages/users/UsersPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import LocalizationsPage from './pages/localizations/LocalizationsPage';
import CouponsPage from './pages/coupons/CouponsPage';
import CoursesPage from './pages/courses/CoursesPage';
import './styles.css';

function useAuthSession() {
  return useSyncExternalStore(subscribeAuth, getSessionUser);
}
function ProtectedRoute() {
  const session = useAuthSession();
  const location = useLocation();
  return session ? (
    <Outlet />
  ) : (
    <Navigate
      to="/auth/sign-in"
      state={{ from: location.pathname + location.search }}
      replace
    />
  );
}
function SessionGate() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    removeLegacyAuth();
    getCurrentUser()
      .then((user) => {
        if (active) {
          setSessionUser(user);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (!active) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setSessionUser(null);
          setStatus('ready');
        } else setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (status === 'loading')
    return (
      <p role="status" className="p-8 text-center text-slate-500">
        Restoring your session…
      </p>
    );
  if (status === 'error')
    return (
      <div className="p-8 text-center">
        <p role="alert">
          Unable to verify your session. Check your connection and try again.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-white"
          onClick={() => {
            setStatus('loading');
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  return <Outlet />;
}
function PublicRoute() {
  const session = useAuthSession();
  const location = useLocation();
  const from: unknown = location.state?.from;
  const destination =
    typeof from === 'string' &&
    /^\/(?:users|profile|categories|coupons|courses|localizations)(?:\?|$)/.test(
      from,
    )
      ? from
      : '/';
  return session ? <Navigate to={destination} replace /> : <Outlet />;
}
function AdminRoute() {
  const [access, setAccess] = useState<
    'loading' | 'allowed' | 'denied' | 'error'
  >('loading');
  useEffect(() => {
    let active = true;
    getCurrentUser({ force: true })
      .then((user) => {
        if (active) setAccess(isAdmin(user) ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setAccess('error');
      });
    return () => {
      active = false;
    };
  }, []);
  if (access === 'loading') return <p role="status">Checking access…</p>;
  if (access === 'error')
    return <p role="alert">Unable to verify access. Reload to try again.</p>;
  return access === 'allowed' ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('learninfy-session');
    channel.onmessage = (event) => {
      if (event.data?.source !== sessionTabId) window.location.reload();
    };
    return () => channel.close();
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SessionGate />}>
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<HomePage />} />
              <Route path="coupons" element={<CouponsPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<AdminRoute />}>
                <Route path="users" element={<UsersPage />} />
                <Route path="categories" element={<CategoriesPage />} />
              </Route>
              <Route path="localizations" element={<LocalizationsPage />} />
            </Route>
          </Route>

          <Route element={<PublicRoute />}>
            <Route path="/auth/sign-in" element={<SignInPage />} />
            <Route
              path="/auth/forgot-password"
              element={<ForgotPasswordPage />}
            />
          </Route>
          <Route
            path="/auth/activate-account/:uid/:token"
            element={<ResetPasswordPage kind="activate" />}
          />
          <Route
            path="/auth/reset-password/:uid/:token"
            element={<ResetPasswordPage kind="reset" />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
