import { Button } from './Button';

export type StatusFilterOption = {
  value: string;
  label: string;
};

export function StatusFilterTabs({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly StatusFilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mb-5 flex flex-wrap gap-2 border-b border-[#e5e5ef] pb-3"
    >
      {[{ value: '', label: 'All statuses' }, ...options].map((option) => (
        <Button
          key={option.value || 'all'}
          aria-pressed={value === option.value}
          className={
            value === option.value
              ? '!border-[#7455c6] !bg-[#f3effb] !text-[#7455c6]'
              : ''
          }
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
