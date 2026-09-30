import { Select } from '../../components/ui/Select';
import { avatarUrl } from '../../lib/avatar';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import {
  TrashIcon,
  CheckIcon,
  AlertIcon,
  UsersIcon,
  BookIcon,
  StarIcon,
  SearchIcon,
} from '../../components/icons/AdminIcons';
import { isAdmin } from '../../lib/permissions';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import type { UserListFilters } from '../../api/services/users';
import { useUsers, useUserActions } from '../../state/users';
import { apiErrorMessage } from '../../api/errors';
import type { User } from '../../types/auth';
import type { Notice } from '../../components/ui/FormNotice';

const statuses = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'AC', label: 'Active' },
  { value: 'PD', label: 'Pending' },
  { value: 'SA', label: 'Suspended' },
  { value: 'NA', label: 'Inactive' },
] as const;

const statusStyles: Record<
  string,
  { surface: string; dot: string; description: string }
> = {
  AC: {
    surface: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    description: 'Account is active',
  },
  PD: {
    surface: 'border-amber-200/70 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    description: 'Awaiting activation',
  },
  SA: {
    surface: 'border-rose-200/70 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    description: 'Access is suspended',
  },
  NA: {
    surface: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    description: 'Account is inactive',
  },
};

function UserNotice({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const success = notice.type === 'success';
  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm ${success ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800' : 'border-rose-100 bg-rose-50/70 text-rose-700'}`}
    >
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${success ? 'bg-emerald-100' : 'bg-rose-100'}`}
      >
        {success ? (
          <CheckIcon width={18} height={18} />
        ) : (
          <AlertIcon width={18} height={18} />
        )}
      </span>
      <span className="leading-6">{notice.text}</span>
    </div>
  );
}

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
  const status = (user.status ?? 'NA').toUpperCase();
  return (
    (
      {
        ACTIVE: 'AC',
        PENDING: 'PD',
        SUSPEND: 'SA',
        SUSPENDED: 'SA',
        INACTIVE: 'NA',
      } as Record<string, string>
    )[status] ?? status
  );
}

function userRole(user: User) {
  if (isAdmin(user)) return 'Admins';
  if (
    user.role?.some(
      (role) => role.toLowerCase().replace(/^role_/, '') === 'instructor',
    )
  )
    return 'Instructors';
  return 'Students';
}

const emptyUsers: User[] = [];

export default function UsersPage() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState<UserListFilters['ordering']>();
  const [roleFilter, setRoleFilter] = useState('All Users');
  const [status, setStatus] = useState('ALL');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      search.trim() ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [search]);
  const usersQuery = useUsers({
    search: debouncedSearch,
    ordering,
    status: (
      {
        AC: 'active',
        PD: 'pending',
        SA: 'suspended',
        NA: 'inactive',
      } as Record<string, UserListFilters['status']>
    )[status],
  });
  const users = usersQuery.data ?? emptyUsers;
  const loading = usersQuery.isFetching;
  const loadFailed = usersQuery.isError;
  const loadNotice: Notice | null = loadFailed
    ? {
        type: 'error',
        text: apiErrorMessage(
          usersQuery.error,
          'Unable to load users. Please try again.',
        ),
      }
    : null;
  const {
    updateUser,
    updateUserStatus,
    updateUserAdminPrivileges,
    deleteUser,
  } = useUserActions();

  useEffect(() => {
    if (!selectedUser) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
        ) ?? [],
      );
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        event.preventDefault();
        setSelectedUser(null);
      }
      if (event.key === 'Tab') {
        const elements = controls();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    dialog?.addEventListener('keydown', onKey);
    return () => {
      dialog?.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [selectedUser, saving]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) => roleFilter === 'All Users' || userRole(user) === roleFilter,
    );
  }, [users, roleFilter]);

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
      await updateUser(selectedUser.id, draft);
      setSelectedUser(null);
      setNotice({
        type: 'success',
        text: 'User details updated successfully.',
      });
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
      await updateUserStatus(user.id, nextStatus);
    } catch (error: unknown) {
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'Unable to change user status.'),
      });
    } finally {
      setWorkingId(null);
    }
  };

  const toggleAdmin = async (user: User) => {
    setWorkingId(user.id);
    setNotice(null);
    try {
      await updateUserAdminPrivileges(user.id, !isAdmin(user));
    } catch (error: unknown) {
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'Unable to update admin privileges.'),
      });
    } finally {
      setWorkingId(null);
    }
  };

  const removeUser = async () => {
    if (!deleteTarget || deleting) return;
    const user = deleteTarget;
    setDeleting(true);
    setWorkingId(user.id);
    setDeleteError(null);
    setNotice(null);
    try {
      await deleteUser(user.id);
      setDeleteTarget(null);
      setNotice({ type: 'success', text: 'User deleted successfully.' });
    } catch (error: unknown) {
      setDeleteError(
        apiErrorMessage(error, 'Unable to delete this user. Please try again.'),
      );
    } finally {
      setDeleting(false);
      setWorkingId(null);
    }
  };

  return (
    <section className="mx-auto w-full">
      <div className="mb-9">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Users Management
          </h1>
          <span className="rounded-full border border-[#e4dfff] bg-[#efedff] px-3 py-1 text-[11px] font-semibold text-[#6c55ff]">
            Admin Panel
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#8792a8]">
          Promote user roles, manage account status, and keep profile
          information up to date.
        </p>
      </div>
      <UserNotice notice={selectedUser ? null : (loadNotice ?? notice)} />
      <div className="my-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Total accounts',
            count: users.length,
            caption: 'Accounts in current results',
            icon: UsersIcon,
            color: 'text-emerald-500',
            bg: 'bg-slate-50',
            border: 'border-b-[#dfdbff]',
          },
          {
            label: 'Administrators',
            count: users.filter((user) => userRole(user) === 'Admins').length,
            caption: 'Admins in current results',
            icon: UsersIcon,
            color: 'text-[#7764ff]',
            bg: 'bg-[#efedff]',
            border: 'border-b-[#dfdbff]',
          },
          {
            label: 'Instructors',
            count: users.filter((user) => userRole(user) === 'Instructors')
              .length,
            caption: 'Instructors in current results',
            icon: StarIcon,
            color: 'text-pink-500',
            bg: 'bg-pink-50',
            border: 'border-b-pink-100',
          },
          {
            label: 'Students',
            count: users.filter((user) => userRole(user) === 'Students').length,
            caption: 'Students in current results',
            icon: BookIcon,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-b-amber-100',
          },
        ].map(({ label, count, caption, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-[22px] border border-[#eef0f6] border-b-4 ${border} bg-white p-5`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a0b6] sm:text-xs">
                {label}
              </p>
              <span className={`rounded-xl p-2.5 ${bg} ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">
              {loading ? (
                <span
                  aria-label="Loading count"
                  className="block h-9 w-14 rounded-lg bg-slate-100 motion-safe:animate-pulse"
                />
              ) : loadFailed ? (
                '—'
              ) : (
                count
              )}
            </p>
            <p className={`mt-1 text-xs font-medium ${color}`}>{caption}</p>
          </div>
        ))}
      </div>
      <div className="mb-7 flex flex-col gap-4 rounded-[22px] border border-[#eef0f6] bg-white p-5 xl:flex-row xl:items-center xl:justify-between">
        <div
          role="group"
          aria-label="Filter by role"
          className="flex flex-wrap gap-1 self-start rounded-2xl bg-[#f2f4f9] p-1"
        >
          {['All Users', 'Admins', 'Instructors', 'Students'].map((role) => (
            <button
              type="button"
              key={role}
              aria-pressed={roleFilter === role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${roleFilter === role ? 'bg-white text-[#6c55ff] shadow-sm' : 'text-[#77839a] hover:text-[#6c55ff]'}`}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="absolute left-3 top-3 h-4 w-4 text-[#9aa8c0]"
            />
            <input
              aria-label="Search users"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email…"
              className="w-full rounded-xl border border-[#e1e6f0] bg-[#f9fafc] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <Select
            label="Sort users"
            className="ui-select-compact"
            value={ordering ?? ''}
            onChange={(value) =>
              setOrdering((value || undefined) as UserListFilters['ordering'])
            }
            options={[
              { value: '', label: 'Default order' },
              { value: '-created_at', label: 'Newest first' },
              { value: 'created_at', label: 'Oldest first' },
            ]}
          />
          <Select
            label="Filter by status"
            className="ui-select-compact"
            value={status}
            onChange={setStatus}
            options={statuses}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-[#e8ebf4] bg-white shadow-[0_2px_3px_rgba(15,23,42,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Account directory
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Review access and keep your community up to date.
            </p>
          </div>
          <div
            aria-label="Account status summary"
            className="flex flex-wrap gap-2"
          >
            {statuses.slice(1).map((option) => (
              <span
                key={option.value}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyles[option.value].surface}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${statusStyles[option.value].dot}`}
                />
                {option.label}
                <span className="ml-1 font-bold tabular-nums">
                  {loading || loadFailed
                    ? '—'
                    : users.filter((user) => userStatus(user) === option.value)
                        .length}
                </span>
              </span>
            ))}
          </div>
        </div>
        {loading ? (
          <div role="status" aria-label="Loading users" className="p-5">
            <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-brand/20 border-t-brand motion-safe:animate-spin" />
              Loading users…
            </div>
            <div
              aria-hidden="true"
              className="space-y-5 motion-safe:animate-pulse"
            >
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-50" />
                  </div>
                  <div className="h-7 w-24 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 py-12 text-center">
            <span
              className={`mb-6 grid h-20 w-20 place-items-center rounded-[26px] border-8 border-white shadow-[0_0_0_1px_#eef0f6,0_8px_24px_#f1f3f9] ${loadFailed ? 'bg-rose-50 text-rose-400' : 'bg-violet-50 text-violet-400'}`}
            >
              {loadFailed ? (
                <AlertIcon aria-hidden="true" className="h-7 w-7" />
              ) : (
                <SearchIcon className="h-7 w-7" />
              )}
            </span>
            <h2 className="text-lg font-semibold">
              {loadFailed ? 'Unable to load users' : 'No Users Found'}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#9aa6bd]">
              {loadFailed
                ? 'We couldn’t retrieve your accounts. Please try again in a moment.'
                : 'No users match your filters.'}
            </p>
            {loadFailed && (
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  void usersQuery.refetch();
                }}
                className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Try again
              </button>
            )}
            {!loadFailed && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatus('ALL');
                  setOrdering(undefined);
                  setRoleFilter('All Users');
                }}
                className="mt-6 rounded-xl bg-[#f1f4f9] px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-[#e9edf6]"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f6]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-slate-400"
                    >
                      Loading users…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-slate-400"
                    >
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const currentStatus = userStatus(user);
                    const busy = workingId !== null;
                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-[#fcfcff]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eeeafd] font-semibold text-[#654ed1]">
                              {avatarUrl(user.avatar) ? (
                                <img
                                  src={avatarUrl(user.avatar)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                userName(user).slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {userName(user)}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.email}
                          <br />
                          <span className="text-xs text-slate-400">
                            {user.phone_number || 'No phone number'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#f1efff] px-2.5 py-1 text-xs font-semibold text-[#654ed1]">
                            {userRole(user) === 'Admins'
                              ? 'Administrator'
                              : userRole(user) === 'Instructors'
                                ? 'Instructor'
                                : 'Student'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Select
                            label={`Status for ${userName(user)}`}
                            title={
                              (statusStyles[currentStatus] ?? statusStyles.NA)
                                .description
                            }
                            className="ui-select-compact ui-select-status"
                            disabled={busy}
                            value={currentStatus}
                            onChange={(value) => void changeStatus(user, value)}
                            leading={
                              <span
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${(statusStyles[currentStatus] ?? statusStyles.NA).dot}`}
                              />
                            }
                            options={[
                              ...(!statusStyles[currentStatus]
                                ? [{ value: currentStatus, label: 'Unknown' }]
                                : []),
                              ...statuses.slice(1),
                            ]}
                          />
                          {workingId === user.id && (
                            <span role="status" className="sr-only">
                              Updating user
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={workingId !== null}
                              onClick={() => openEditor(user)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#654ed1] hover:bg-[#f1efff]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void toggleAdmin(user)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            >
                              {isAdmin(user) ? 'Remove admin' : 'Make admin'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setDeleteError(null);
                                setNotice(null);
                                setDeleteTarget(user);
                              }}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[#edf0f7] px-5 py-3 text-xs text-slate-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {deleteTarget && (
        <ConfirmationDialog
          title="Delete this user?"
          description="This account will be permanently deleted. This action cannot be undone."
          confirmLabel="Delete user"
          pendingLabel="Deleting…"
          pending={deleting}
          error={deleteError}
          icon={<TrashIcon className="h-6 w-6" />}
          onConfirm={() => void removeUser()}
          onCancel={() => setDeleteTarget(null)}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-brand"
            >
              {userName(deleteTarget).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-slate-800">
                {userName(deleteTarget)}
              </p>
              <p className="mt-0.5 break-all text-xs text-slate-500">
                {deleteTarget.email}
              </p>
            </div>
          </div>
        </ConfirmationDialog>
      )}
      {selectedUser ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <form
            onSubmit={(event) => void saveUser(event)}
            className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5bd5]">
                  User details
                </p>
                <h2
                  id="edit-user-title"
                  className="mt-1 font-display text-2xl font-bold text-slate-900"
                >
                  Edit {userName(selectedUser)}
                </h2>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedUser(null)}
                aria-label="Close edit user dialog"
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <UserNotice notice={notice} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  'first_name',
                  'last_name',
                  'username',
                  'email',
                  'phone_number',
                ] as const
              ).map((field) => (
                <label
                  key={field}
                  className="text-sm font-semibold text-slate-700"
                >
                  {field
                    .replace('_', ' ')
                    .replace(/^\w/, (letter) => letter.toUpperCase())}
                  <input
                    required={field !== 'phone_number'}
                    type={field === 'email' ? 'email' : 'text'}
                    value={draft[field]}
                    onChange={(event) =>
                      setDraft({ ...draft, [field]: event.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#e4e7f0] px-3 py-2.5 font-normal outline-none focus:border-[#8c7bea] focus:ring-2 focus:ring-[#8c7bea]/15"
                  />
                </label>
              ))}
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Bio
                <textarea
                  value={draft.bio}
                  onChange={(event) =>
                    setDraft({ ...draft, bio: event.target.value })
                  }
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#e4e7f0] px-3 py-2.5 font-normal outline-none focus:border-[#8c7bea] focus:ring-2 focus:ring-[#8c7bea]/15"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedUser(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#5f48d8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(95,72,216,0.22)] hover:bg-[#533cc4] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
