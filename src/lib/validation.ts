import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters.');
const email = z.string().trim().email('Enter a valid email address.');

export const signInSchema = z.object({ email, password });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password });

export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
