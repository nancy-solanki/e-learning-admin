import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { AuthLayout } from '../../components/layout/AuthLayout';
import { FormField } from '../../components/ui/FormField';
import { FormNotice, type Notice } from '../../components/ui/FormNotice';
import { api, apiErrorMessage, authEndpoints } from '../../lib/api';
import { applyServerErrors } from '../../lib/form';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../../lib/validation';

export default function ForgotPasswordPage() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const submit = async (values: ForgotPasswordValues) => {
    setNotice(null);

    try {
      const { data } = await api.post<{ message: string }>(
        authEndpoints.sendResetPasswordEmail,
        values,
      );
      setNotice({ type: 'success', text: data.message });
    } catch (error) {
      applyServerErrors<ForgotPasswordValues>(error, setError);
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'Unable to send the reset email.'),
      });
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We’ll send a secure reset link to your email."
    >
      <form
        className="grid gap-[18px]"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          register={register}
          errors={errors}
        />

        <FormNotice notice={notice} />

        <button
          className="h-[49px] rounded-lg border-0 bg-brand font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#69748c]">
        <Link to="/auth/sign-in" className="font-bold text-brand">
          Go to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
