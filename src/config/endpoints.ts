export const ENDPOINTS = {
  USER: {
    ME: '/api/v1/users/me/',
    LIST: '/api/v1/users/',
    DETAIL: (id: string | number) => `/api/v1/users/${id}/`,
    MODIFY_ADMIN_PRIVILEGES: (id: string | number) =>
      `/api/v1/users/${id}/modify_admin_privileges/`,
    MODIFY_USER_STATUS: (id: string | number) =>
      `/api/v1/users/${id}/modify_user_status/`,
  },
  AUTH: {
    SIGN_IN: '/api/v1/auth/sign-in/',
    SIGN_UP: '/api/v1/auth/sign-up/',
    SIGN_OUT: '/api/v1/auth/sign-out/',
    REFRESH: '/api/v1/auth/refresh/',
    SEND_RESET_PASSWORD_EMAIL: '/api/v1/auth/send-reset-password-email/',
    FORGOT_PASSWORD_EMAIL: '/api/v1/auth/send-reset-password-email/',
    RESET_PASSWORD: (token: string, uid: string) =>
      `/api/v1/auth/reset-password/${token}/${uid}/`,
    ACTIVATE_ACCOUNT: (uid: string, token: string) =>
      `/api/v1/auth/activate-account/${uid}/${token}/`,
    RESEND_ACTIVATION_EMAIL: '/api/v1/auth/resend-activation-email/',
    CHANGE_PASSWORD: '/api/v1/auth/change-password/',
  },
  COURSE: {
    LIST: '/api/v1/course/',
    DETAIL: (slug: string) => `/api/v1/course/${slug}/`,
    CATEGORY_COURSES: (slug: string) => `/api/v1/course/category/${slug}/`,
  },
  CATEGORY: {
    LIST: '/api/v1/category/',
    DETAIL: (slug: string) => `/api/v1/category/${slug}/`,
  },
  ENROLL: {
    MANAGEMENT: '/api/v1/enroll/management/',
  },
  RATING: {
    MANAGEMENT: '/api/v1/rating/management/',
    DETAIL: (id: string | number) => `/api/v1/rating/management/${id}/`,
  },
  COUPON: {
    MANAGEMENT: '/api/v1/coupon/management/',
    DETAIL: (id: string | number) => `/api/v1/coupon/management/${id}/`,
    VALIDATE: (code: string) => `/api/v1/coupon/validate/${code}/`,
  },
  WALLET: {
    RETRIEVE: '/api/v1/wallet/',
    DETAIL: (id: string | number) => `/api/v1/wallet/${id}/`,
  },
  BANK: {
    LIST: '/api/v1/bank/',
    DETAIL: (id: string | number) => `/api/v1/bank/${id}/`,
  },
} as const;
