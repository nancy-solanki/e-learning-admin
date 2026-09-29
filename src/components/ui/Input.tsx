import type { ComponentProps, ReactNode } from 'react';

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input {...props} className={`ui-input ${className}`} />;
}
export function Textarea({
  className = '',
  ...props
}: ComponentProps<'textarea'>) {
  return (
    <textarea {...props} className={`ui-input ui-textarea ${className}`} />
  );
}
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="ui-field">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={`${htmlFor}-help`}
          className={error ? 'ui-field-error' : 'ui-field-hint'}
          role={error ? 'alert' : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
