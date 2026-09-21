import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/layout/AuthLayout';
import { FormField } from '../../components/ui/FormField';
import { FormNotice, type Notice } from '../../components/ui/FormNotice';
import {
  api,
  apiErrorMessage,
  authEndpoints,
  getCurrentUser,
  saveTokens,
  type Tokens,
} from '../../lib/api';
import { applyServerErrors } from '../../lib/form';
import { signInSchema, type SignInValues } from '../../lib/validation';

export default function SignInPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = async (values: SignInValues) => {
    setNotice(null);

    try {
      const { data } = await api.post<Tokens>(authEndpoints.signIn, values);
      saveTokens(data);
      await getCurrentUser();
      navigate('/', { replace: true });
    } catch (error) {
      applyServerErrors<SignInValues>(error, setError);
      setNotice({
        type: 'error',
        text: apiErrorMessage(
          error,
          'Unable to sign in. Check your email and password.',
        ),
      });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your learning journey"
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
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          register={register}
          errors={errors}
        />

        <Link
          to="/auth/forgot-password"
          className="justify-self-end text-[13px] font-bold text-brand"
        >
          Forgot password?
        </Link>

        <FormNotice notice={notice} />

        <button
          className="h-[49px] rounded-lg border-0 bg-brand font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
