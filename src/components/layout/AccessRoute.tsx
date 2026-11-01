import { Navigate, Outlet } from 'react-router-dom';
import { useAccessState, type AppPage } from '../../state/access';

export function AccessRoute({ page }: { page: AppPage }) {
  const access = useAccessState();
  if (access.isPending) return <p role="status">Checking access…</p>;
  if (access.isError)
    return <p role="alert">Unable to verify access. Reload to try again.</p>;
  return access.canAccess(page) ? <Outlet /> : <Navigate to="/" replace />;
}
