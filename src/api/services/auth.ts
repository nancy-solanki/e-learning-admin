import { broadcastSessionChange } from '../../state/session';
import { api, resetCsrf, withAuthLock } from '../axios';
import { ENDPOINTS, authEndpoints } from '../endpoints';
import { fetchCurrentUser } from './users';
import type {
  SignInCredentials,
  ChangePasswordCredentials,
} from '../../types/auth';
export async function signIn(values: SignInCredentials) {
  return withAuthLock(async () => {
    await api.post(authEndpoints.signIn, values);
    resetCsrf();
    broadcastSessionChange();
  }).then(() => fetchCurrentUser());
}
export async function signOut() {
  await withAuthLock(() => api.post(authEndpoints.signOut));
  resetCsrf();
  broadcastSessionChange();
}
export async function sendResetPasswordEmail(values: { email: string }) {
  return (
    await api.post<{ message: string }>(
      authEndpoints.sendResetPasswordEmail,
      values,
    )
  ).data;
}
export async function completePasswordAction(
  kind: 'activate' | 'reset',
  uid: string,
  token: string,
  values: { password: string },
) {
  const endpoint =
    kind === 'activate'
      ? ENDPOINTS.AUTH.ACTIVATE_ACCOUNT(uid, token)
      : ENDPOINTS.AUTH.RESET_PASSWORD(token, uid);
  return (
    await api.post<{ message: string }>(
      endpoint,
      kind === 'activate' ? {} : values,
    )
  ).data;
}
export async function changePassword(values: ChangePasswordCredentials) {
  await api.post(authEndpoints.changePassword, values);
}
