export interface SignUpCredentials {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  access?: string;
  refresh?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  uid: string;
  token: string;
  password: string;
  confirm_password: string;
}

export interface ActivateAccountCredentials {
  uid: string;
  token: string;
}

export interface ResendActivationEmailCredentials {
  email: string;
}

export interface ChangePasswordCredentials {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string;
  phone_number: string;
  avatar: { id: string; url: string; name: string } | null;
  birth_date: string | null;
  gender: 'MALE' | 'FEMALE' | string;
  email_notifications: boolean;
  public_profile: boolean;
  search_engine_visibility: boolean;
  share_learning_activity: boolean;
  role: string[];
  language: string;
  bio: string;
  status?: 'AC' | 'PD' | 'SA' | 'NA' | string;
  is_staff?: boolean;
  is_superuser?: boolean;
}
