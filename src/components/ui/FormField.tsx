import { Input as TextInput } from './Input';
import { useId } from 'react';
import { PasswordInput } from './PasswordInput';
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from 'react-hook-form';

type FormFieldProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: string;
  placeholder: string;
};

export function FormField<T extends FieldValues>({
  label,
  name,
  register,
  errors,
  type = 'text',
  placeholder,
}: FormFieldProps<T>) {
  const error = errors[name]?.message;
  const id = useId();
  const Input = type === 'password' ? PasswordInput : TextInput;

  return (
    <div className="grid gap-2 text-sm font-bold text-slate-800">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        {...(type === 'password' ? { visibilityLabel: label } : { type })}
        {...register(name)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span
          id={`${id}-error`}
          className="text-xs font-medium text-red-600"
          role="alert"
        >
          {String(error)}
        </span>
      )}
    </div>
  );
}
