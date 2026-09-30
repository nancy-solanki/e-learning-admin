import { api } from '../axios';
import { ENDPOINTS, authEndpoints } from '../endpoints';
import type { Tokens } from '../../state/session';
import type {
  SignInCredentials,
  ChangePasswordCredentials,
} from '../../types/auth';
export async function signIn(values: SignInCredentials) {
  return (await api.post<Tokens>(authEndpoints.signIn, values)).data;
}
export async function signOut(tokens: Tokens) {
  await api.post(
    authEndpoints.signOut,
    { refresh_token: tokens.refresh },
    { headers: { Authorization: `Bearer ${tokens.access}` } },
  );
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
