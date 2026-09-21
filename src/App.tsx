import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { readTokens } from './lib/api';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignInPage from './pages/auth/SignInPage';
import HomePage from './pages/dashboard/HomePage';
import ProfilePage from './pages/profile/ProfilePage';
import UsersPage from './pages/users/UsersPage';
import './styles.css';

function ProtectedRoute() {
  const isAuthenticated = Boolean(readTokens());
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/sign-in" replace />;
}

function PublicRoute() {
  const isAuthenticated = Boolean(readTokens());
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/profile"
            element={
              <HomePage>
                <ProfilePage />
              </HomePage>
            }
          />
          <Route
            path="/users"
            element={
              <HomePage>
                <UsersPage />
              </HomePage>
            }
          />
        </Route>

        <Route element={<PublicRoute />}>
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route
            path="/auth/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route
            path="/auth/activate-account/:uid/:token"
            element={<ResetPasswordPage kind="activate" />}
          />
          <Route
            path="/auth/reset-password/:uid/:token"
            element={<ResetPasswordPage kind="reset" />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
