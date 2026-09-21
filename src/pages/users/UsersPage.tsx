import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  apiErrorMessage,
  deleteUser,
  listUsers,
  updateUser,
  updateUserAdminPrivileges,
  updateUserStatus,
} from '../../lib/api';
import type { User } from '../../types/auth';
import { FormNotice, type Notice } from '../../components/ui/FormNotice';

const statuses = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'AC', label: 'Active' },
  { value: 'PD', label: 'Pending' },
  { value: 'SA', label: 'Suspended' },
  { value: 'NA', label: 'Inactive' },
] as const;

const statusStyles: Record<string, string> = {
  AC: 'bg-emerald-50 text-emerald-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PD: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-amber-50 text-amber-700',
  SA: 'bg-rose-50 text-rose-700',
  SUSPEND: 'bg-rose-50 text-rose-700',
  NA: 'bg-slate-100 text-slate-600',
  INACTIVE: 'bg-slate-100 text-slate-600',
};

const emptyDraft = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  phone_number: '',
  bio: '',
};

function userName(user: User) {
  return (
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    user.email
  );
}

function userStatus(user: User) {
  return (user.status ?? 'NA').toUpperCase();
}

function isAdmin(user: User) {
  return (
    user.is_staff === true ||
    user.is_superuser === true ||
    user.role.some((role) => ['admin', 'administrator', 'staff'].includes(role.toLowerCase()))
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listUsers()
      .then((response) => {
        if (active) setUsers(Array.isArray(response) ? response : response.results);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({
            type: 'error',
            text: apiErrorMessage(error, 'Unable to load users. Please try again.'),
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = status === 'ALL' || userStatus(user) === status;
      const matchesSearch =
        !query ||
        [userName(user), user.email, user.username, user.phone_number]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, status, users]);

  const openEditor = (user: User) => {
    setSelectedUser(user);
    setDraft({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      phone_number: user.phone_number ?? '',
      bio: user.bio ?? '',
    });
    setNotice(null);
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateUser(selectedUser.id, draft);
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)),
      );
      setSelectedUser(null);
      setNotice({ type: 'success', text: 'User details updated successfully.' });
    } catch (error: unknown) {
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'Unable to update this user.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (user: User, nextStatus: string) => {
    setWorkingId(user.id);
    setNotice(null);
    try {
      const updated = await updateUserStatus(user.id, nextStatus);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ...updated, status: updated.status ?? nextStatus } : item)),
      );
    } catch (error: unknown) {
      setNotice({ type: 'error', text: apiErrorMessage(error, 'Unable to change user status.') });
    } finally {
      setWorkingId(null);
    }
  };

  const toggleAdmin = async (user: User) => {
    setWorkingId(user.id);
    setNotice(null);
    try {
      const updated = await updateUserAdminPrivileges(user.id, !isAdmin(user));
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ...updated } : item)),
      );
    } catch (error: unknown) {
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'Unable to update admin privileges.'),
      });
    } finally {
      setWorkingId(null);
    }
  };

  const removeUser = async (user: User) => {
    if (!window.confirm(`Delete ${userName(user)}? This action cannot be undone.`)) return;
    setWorkingId(user.id);
    setNotice(null);
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setNotice({ type: 'success', text: 'User deleted successfully.' });
    } catch (error: unknown) {
      setNotice({ type: 'error', text: apiErrorMessage(error, 'Unable to delete this user.') });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1440px]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5bd5]">Administration</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.06em] text-slate-900">Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Manage learner and staff accounts, access privileges, and account status.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e4defb] bg-[#f8f6ff] px-4 py-3 text-sm text-[#5f48d8]">
          New users join through the sign-up flow.
        </div>
      </div>

      <FormNotice notice={notice} />

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ebf4] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#edf0f7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              aria-label="Search users"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or username"
              className="w-full rounded-xl border border-[#e4e7f0] bg-[#fafbfe] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#8c7bea] focus:ring-2 focus:ring-[#8c7bea]/15"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[#e4e7f0] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-[#8c7bea]"
          >
            {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#fafbfe] text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f6]">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-400">Loading users…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-400">No users match your filters.</td></tr>
              ) : filteredUsers.map((user) => {
                const currentStatus = userStatus(user);
                const busy = workingId === user.id;
                return (
                  <tr key={user.id} className="transition hover:bg-[#fcfcff]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eeeafd] font-semibold text-[#654ed1]">
                          {user.avatar?.url ? <img src={user.avatar.url} alt="" className="h-full w-full object-cover" /> : userName(user).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{userName(user)}</p>
                          <p className="truncate text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{user.email}<br /><span className="text-xs text-slate-400">{user.phone_number || 'No phone number'}</span></td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#f1efff] px-2.5 py-1 text-xs font-semibold text-[#654ed1]">{isAdmin(user) ? 'Administrator' : 'User'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Status for ${userName(user)}`}
                        disabled={busy}
                        value={['AC', 'PD', 'SA', 'NA'].includes(currentStatus) ? currentStatus : 'NA'}
                        onChange={(event) => void changeStatus(user, event.target.value)}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${statusStyles[currentStatus] ?? statusStyles.NA}`}
                      >
                        {statuses.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEditor(user)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#654ed1] hover:bg-[#f1efff]">Edit</button>
                        <button type="button" disabled={busy} onClick={() => void toggleAdmin(user)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">{isAdmin(user) ? 'Remove admin' : 'Make admin'}</button>
                        <button type="button" disabled={busy} onClick={() => void removeUser(user)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#edf0f7] px-5 py-3 text-xs text-slate-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <form onSubmit={(event) => void saveUser(event)} className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5bd5]">User details</p><h2 id="edit-user-title" className="mt-1 font-display text-2xl font-bold text-slate-900">Edit {userName(selectedUser)}</h2></div>
              <button type="button" onClick={() => setSelectedUser(null)} aria-label="Close edit user dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(['first_name', 'last_name', 'username', 'email', 'phone_number'] as const).map((field) => (
                <label key={field} className="text-sm font-semibold text-slate-700">
                  {field.replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())}
                  <input required={field !== 'phone_number'} type={field === 'email' ? 'email' : 'text'} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#e4e7f0] px-3 py-2.5 font-normal outline-none focus:border-[#8c7bea] focus:ring-2 focus:ring-[#8c7bea]/15" />
                </label>
              ))}
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Bio<textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-[#e4e7f0] px-3 py-2.5 font-normal outline-none focus:border-[#8c7bea] focus:ring-2 focus:ring-[#8c7bea]/15" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#5f48d8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(95,72,216,0.22)] hover:bg-[#533cc4] disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
