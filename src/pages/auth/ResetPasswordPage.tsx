import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { AuthLayout } from '../../components/layout/AuthLayout';
import { FormField } from '../../components/ui/FormField';
import { FormNotice, type Notice } from '../../components/ui/FormNotice';
import { ENDPOINTS } from '../../config/endpoints';
import { api, apiErrorMessage } from '../../lib/api';
import { applyServerErrors } from '../../lib/form';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../../lib/validation';

export default function ResetPasswordPage({
  kind,
}: {
  kind: 'activate' | 'reset';
}) {
  const { uid, token } = useParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const submit = async (values: ResetPasswordValues) => {
    if (!uid || !token) {
      setNotice({ type: 'error', text: 'This link is invalid or expired.' });
      return;
    }

    setNotice(null);

    try {
      const path =
        kind === 'activate'
          ? ENDPOINTS.AUTH.ACTIVATE_ACCOUNT(uid, token)
          : ENDPOINTS.AUTH.RESET_PASSWORD(token, uid);
      const { data } = await api.post<{ message: string }>(
        path,
        kind === 'activate' ? {} : values,
      );
      setNotice({ type: 'success', text: data.message });
    } catch (error) {
      applyServerErrors<ResetPasswordValues>(error, setError);
      setNotice({
        type: 'error',
        text: apiErrorMessage(error, 'This link is invalid or expired.'),
      });
    }
  };

  return (
    <AuthLayout
      title={
        kind === 'activate' ? 'Activate your account' : 'Choose a new password'
      }
      subtitle={
        kind === 'activate'
          ? 'Confirm your email to unlock Learninfy.'
          : 'Your new password must be strong and memorable.'
      }
    >
      <form
        className="grid gap-[18px]"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        {kind === 'reset' && (
          <FormField
            label="New password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            register={register}
            errors={errors}
          />
        )}

        <FormNotice notice={notice} />

        <button
          className="h-[49px] rounded-lg border-0 bg-brand font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Please wait…'
            : kind === 'activate'
              ? 'Activate account'
              : 'Reset password'}
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
