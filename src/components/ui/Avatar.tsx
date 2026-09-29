import { useState } from 'react';
import { avatarUrl } from '../../lib/avatar';
import type { User } from '../../types/auth';

export function Avatar({
  user,
  src,
  className = '',
}: {
  user: User | null;
  src?: string | null;
  className?: string;
}) {
  const url = src ?? avatarUrl(user?.avatar);
  const [failed, setFailed] = useState<string>();
  const name =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'Account';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className={`ui-avatar ${className}`}>
      {url && failed !== url ? (
        <img src={url} alt={name} onError={() => setFailed(url)} />
      ) : (
        <span role="img" aria-label={name}>
          {initials}
        </span>
      )}
    </span>
  );
}
