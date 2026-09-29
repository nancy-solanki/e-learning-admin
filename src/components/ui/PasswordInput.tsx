import { Input } from './Input';
import { EyeIcon, EyeOffIcon } from '../icons/AdminIcons';
import { useState, type ComponentProps } from 'react';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  visibilityLabel?: string;
};

export function PasswordInput({
  className = '',
  visibilityLabel = 'password',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full pr-12 ${className}`}
      />
      <button
        type="button"
        aria-label={`${visible ? 'Hide' : 'Show'} ${visibilityLabel.toLowerCase()}`}
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
      >
        {visible ? (
          <EyeOffIcon aria-hidden="true" width={20} height={20} />
        ) : (
          <EyeIcon aria-hidden="true" width={20} height={20} />
        )}
      </button>
    </span>
  );
}
