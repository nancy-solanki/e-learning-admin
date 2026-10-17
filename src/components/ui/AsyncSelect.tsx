import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from './Select';
import { Button } from './Button';
import type { ListOption } from '../../api/services/options';

export function AsyncSelect({
  id,
  label,
  value,
  onChange,
  queryKey,
  loadOptions,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  queryKey: readonly string[];
  loadOptions: (signal?: AbortSignal) => Promise<ListOption[]>;
  allLabel: string;
}) {
  const messageId = useId();
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadOptions(signal),
  });
  const options = query.data ?? [];
  const missing = value && !options.some((option) => option.value === value);
  return (
    <div>
      <Select
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        disabled={query.isPending || query.isError}
        describedBy={messageId}
        options={[
          {
            value: '',
            label: query.isPending
              ? `Loading ${label.toLowerCase()}…`
              : allLabel,
          },
          ...(missing
            ? [{ value, label: `Selected ${label.toLowerCase()} unavailable` }]
            : []),
          ...options,
        ]}
      />
      <div id={messageId} className="mt-2 text-xs text-slate-500">
        {query.isError ? (
          <div role="alert">
            Could not load {label.toLowerCase()}.{' '}
            <Button
              className="!px-2 !py-1 !text-xs"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : query.isSuccess && options.length === 0 ? (
          `No ${label.toLowerCase()} available.`
        ) : null}
      </div>
    </div>
  );
}
