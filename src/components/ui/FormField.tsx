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

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-800">
      <span>{label}</span>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`h-[50px] rounded-lg border px-3.5 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 ${
          error ? 'border-red-400' : 'border-[#d0d5df]'
        }`}
      />
      {error && (
        <span className="text-xs font-medium text-red-600" role="alert">
          {String(error)}
        </span>
      )}
    </label>
  );
}
