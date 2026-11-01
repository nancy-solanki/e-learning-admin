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
import { getAccessibleDestination, resolveAppRole } from './state/access';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignInPage from './pages/auth/SignInPage';
import HomePage from './pages/dashboard/HomePage';
import AdminLayout from './components/layout/AdminLayout';
import { AccessRoute } from './components/layout/AccessRoute';
import ProfilePage from './pages/profile/ProfilePage';
import UsersPage from './pages/users/UsersPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import LocalizationsPage from './pages/localizations/LocalizationsPage';
import CouponsPage from './pages/coupons/CouponsPage';
import CoursesPage from './pages/courses/CoursesPage';
import CurriculumPage from './pages/curriculum/CurriculumPage';
import BankAccountsPage from './pages/bank/BankAccountsPage';
import WalletsPage from './pages/wallets/WalletsPage';
import EnrollmentsPage from './pages/enrollments/EnrollmentsPage';
import RatingsPage from './pages/ratings/RatingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles.css';

function useAuthSession() {
  return useSyncExternalStore(subscribeAuth, getSessionUser);
}
function ProtectedRoute() {
  const session = useAuthSession();
  const location = useLocation();
  if (!session) {
    return (
      <Navigate
        to="/auth/sign-in"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }
  if (resolveAppRole(session) === 'member') {
    return (
      <Navigate
        to="/auth/sign-in"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }
  return <Outlet />;
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
  const destination = getAccessibleDestination(session, from);
  return session && resolveAppRole(session) !== 'member' ? (
    <Navigate to={destination} replace />
  ) : (
    <Outlet />
  );
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
              <Route element={<AccessRoute page="home" />}>
                <Route index element={<HomePage />} />
              </Route>
              <Route element={<AccessRoute page="coupons" />}>
                <Route path="coupons" element={<CouponsPage />} />
              </Route>
              <Route element={<AccessRoute page="courses" />}>
                <Route path="courses" element={<CoursesPage />} />
              </Route>
              <Route element={<AccessRoute page="bank-accounts" />}>
                <Route path="bank-accounts" element={<BankAccountsPage />} />
              </Route>
              <Route element={<AccessRoute page="wallets" />}>
                <Route path="wallets" element={<WalletsPage />} />
              </Route>
              <Route element={<AccessRoute page="sections" />}>
                <Route
                  path="sections"
                  element={<CurriculumPage key="sections" kind="sections" />}
                />
              </Route>
              <Route element={<AccessRoute page="lectures" />}>
                <Route
                  path="lectures"
                  element={<CurriculumPage key="lectures" kind="lectures" />}
                />
              </Route>
              <Route element={<AccessRoute page="profile" />}>
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route element={<AccessRoute page="enrollments" />}>
                <Route path="enrollments" element={<EnrollmentsPage />} />
              </Route>
              <Route element={<AccessRoute page="users" />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route element={<AccessRoute page="categories" />}>
                <Route path="categories" element={<CategoriesPage />} />
              </Route>
              <Route element={<AccessRoute page="ratings" />}>
                <Route path="ratings" element={<RatingsPage />} />
              </Route>
              <Route element={<AccessRoute page="localizations" />}>
                <Route path="localizations" element={<LocalizationsPage />} />
              </Route>
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
