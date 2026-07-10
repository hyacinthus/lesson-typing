import type { AuthError } from '@supabase/supabase-js';
import i18n from '../i18n';

// Supabase auth error codes we have translations for; everything else falls
// back to the raw (English) message rather than hiding the cause.
const AUTH_ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'auth.invalid_credentials',
  user_already_exists: 'auth.email_already_exists',
};

export function mapAuthError(error: AuthError): string {
  const key = error.code ? AUTH_ERROR_KEYS[error.code] : undefined;
  return key ? i18n.t(key) : error.message;
}
