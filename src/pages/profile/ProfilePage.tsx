import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import {
  api,
  apiErrorMessage,
  authEndpoints,
  getCurrentUser,
  updateCurrentUser,
  uploadUserAvatar,
} from '../../lib/api';
import type { User } from '../../types/auth';

type ProfileFields = Pick<
  User,
  'first_name' | 'last_name' | 'username' | 'phone_number' | 'language' | 'bio'
>;
type Preferences = Pick<
  User,
  | 'email_notifications'
  | 'public_profile'
  | 'search_engine_visibility'
  | 'share_learning_activity'
>;
type PasswordFields = {
  old_password: string;
  new_password: string;
  confirm_password: string;
};

const emptyPassword: PasswordFields = {
  old_password: '',
  new_password: '',
  confirm_password: '',
};
const settingsSections = [
  'Edit Profile',
  'Notifications',
  'Password & Security',
] as const;

export default function ProfilePage() {
  const [activeSection, setActiveSection] =
    useState<(typeof settingsSections)[number]>('Edit Profile');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [password, setPassword] = useState(emptyPassword);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setUser(data);
        setProfile({
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          phone_number: data.phone_number,
          language: data.language,
          bio: data.bio,
        });
        setPreferences({
          email_notifications: data.email_notifications,
          public_profile: data.public_profile,
          search_engine_visibility: data.search_engine_visibility,
          share_learning_activity: data.share_learning_activity,
        });
      })
      .catch((requestError: unknown) =>
        setError(apiErrorMessage(requestError, 'Unable to load your profile.')),
      );
  }, []);

  const selectSection = (section: (typeof settingsSections)[number]) => {
    setActiveSection(section);
    setError(null);
    setSuccess(null);
  };

  const updateProfileField = (field: keyof ProfileFields, value: string) => {
    setProfile((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setSuccess(null);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !preferences) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCurrentUser({ ...profile, ...preferences });
      setUser(updated);
      setSuccess('Profile details saved successfully.');
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, 'Unable to save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preferences) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCurrentUser(preferences);
      setUser(updated);
      setSuccess('Notification preferences saved successfully.');
    } catch (requestError: unknown) {
      setError(
        apiErrorMessage(
          requestError,
          'Unable to save notification preferences.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(authEndpoints.changePassword, password);
      setPassword(emptyPassword);
      setSuccess('Password changed successfully.');
    } catch (requestError: unknown) {
      setError(
        apiErrorMessage(requestError, 'Unable to change your password.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile images must be smaller than 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      setUser(await uploadUserAvatar(file));
      setSuccess('Profile photo updated successfully.');
    } catch (requestError: unknown) {
      setPreviewUrl(null);
      setError(
        apiErrorMessage(requestError, 'Unable to upload your profile image.'),
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;
  const avatar = previewUrl ?? user?.avatar?.url;
  const inputClass =
    'h-11 rounded-lg border border-[#dfe5ee] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10';

  return (
    <section className="mx-auto w-full max-w-5xl py-2">
      <div className="mb-8 flex items-center justify-between border-b border-[#e8ebf0] pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[#858e9d]">
            Manage your personal information and account settings.
          </p>
        </div>
        {activeSection === 'Edit Profile' ? (
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="space-y-1" aria-label="Profile settings">
          {settingsSections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => selectSection(section)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                activeSection === section
                  ? 'bg-[#f1efff] text-brand'
                  : 'text-[#7c8695] hover:bg-[#f8f8fb] hover:text-slate-700'
              }`}
            >
              {section}
              {activeSection === section ? <span>›</span> : null}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {error ? (
            <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          {activeSection === 'Edit Profile' && profile ? (
            <form
              id="profile-form"
              onSubmit={saveProfile}
              className="space-y-9"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-[#8a93a2]">
                  Update your personal information.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-[#eeeaff] text-xl font-bold text-brand">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={user?.full_name ?? 'Profile'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <label className="inline-flex cursor-pointer rounded-lg bg-[#f1efff] px-4 py-2 text-sm font-semibold text-brand hover:bg-[#e8e3ff]">
                    {uploading ? 'Uploading…' : 'Change photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={uploadAvatar}
                      disabled={uploading}
                    />
                  </label>
                  <p className="mt-2 text-xs text-[#929aa8]">
                    JPG, PNG or WEBP · Max 5 MB
                  </p>
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-bold text-slate-700">
                  Personal information
                </h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      ['first_name', 'First name'],
                      ['last_name', 'Last name'],
                      ['username', 'Username'],
                      ['phone_number', 'Phone number'],
                      ['language', 'Language'],
                    ] as const
                  ).map(([field, label]) => (
                    <label
                      key={field}
                      className="grid gap-2 text-xs font-semibold text-[#707a89]"
                    >
                      {label}
                      <input
                        className={inputClass}
                        value={profile[field]}
                        onChange={(event) =>
                          updateProfileField(field, event.target.value)
                        }
                      />
                    </label>
                  ))}
                  <label className="grid gap-2 text-xs font-semibold text-[#707a89] sm:col-span-2">
                    Email
                    <input
                      className={`${inputClass} bg-[#f8fafc] text-[#8a93a2]`}
                      value={user?.email ?? ''}
                      readOnly
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-[#707a89] sm:col-span-2">
                    Bio
                    <textarea
                      className="min-h-28 resize-y rounded-lg border border-[#dfe5ee] bg-white px-3 py-3 text-sm text-slate-700 placeholder:text-[#9aa3b1] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                      placeholder="Tell us a little about yourself"
                      value={profile.bio}
                      onChange={(event) =>
                        updateProfileField('bio', event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </form>
          ) : null}

          {activeSection === 'Notifications' && preferences ? (
            <form onSubmit={savePreferences}>
              <h2 className="text-lg font-bold text-slate-800">
                Notifications
              </h2>
              <p className="mt-1 text-sm text-[#8a93a2]">
                Choose how you want to be visible and receive updates.
              </p>
              <div className="mt-7 divide-y divide-[#edf0f4] border-y border-[#edf0f4]">
                {(
                  [
                    [
                      'email_notifications',
                      'Email notifications',
                      'Receive important account and learning updates by email.',
                    ],
                    [
                      'public_profile',
                      'Public profile',
                      'Allow other users to view your public profile.',
                    ],
                    [
                      'search_engine_visibility',
                      'Search engine visibility',
                      'Allow your public profile to appear in search engines.',
                    ],
                    [
                      'share_learning_activity',
                      'Share learning activity',
                      'Show your learning activity to other users.',
                    ],
                  ] as const
                ).map(([field, title, description]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-center justify-between gap-5 py-5"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-700">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs text-[#8b94a2]">
                        {description}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences[field]}
                      onChange={(event) =>
                        setPreferences({
                          ...preferences,
                          [field]: event.target.checked,
                        })
                      }
                      className="h-5 w-5 shrink-0 accent-brand"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save notifications'}
                </button>
              </div>
            </form>
          ) : null}

          {activeSection === 'Password & Security' ? (
            <form onSubmit={changePassword} className="max-w-xl">
              <h2 className="text-lg font-bold text-slate-800">
                Password & Security
              </h2>
              <p className="mt-1 text-sm text-[#8a93a2]">
                Keep your account secure with a strong password.
              </p>
              <div className="mt-7 grid gap-5">
                {(
                  [
                    ['old_password', 'Current password'],
                    ['new_password', 'New password'],
                    ['confirm_password', 'Confirm new password'],
                  ] as const
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="grid gap-2 text-xs font-semibold text-[#707a89]"
                  >
                    {label}
                    <input
                      type="password"
                      required
                      className={inputClass}
                      value={password[field]}
                      onChange={(event) =>
                        setPassword((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
