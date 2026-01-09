export const AUTH_CONFIG = {
  DEFAULT_TOKEN_LIFETIME_MINUTES: parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '30'),
  REFRESH_THRESHOLD_MINUTES: 5,
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    TOKEN_EXPIRY: 'access_token_expiry'
  }
} as const;