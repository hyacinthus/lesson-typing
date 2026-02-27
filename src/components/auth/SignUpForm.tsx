import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignUpFormProps {
  redirectTo?: string;
}

export function SignUpForm({ redirectTo }: SignUpFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // When email confirmation is on, Supabase returns a fake user (identities=[])
      // for already-registered emails instead of an error, to prevent enumeration.
      if (data.user?.identities?.length === 0) {
        setError(t('auth.email_already_exists'));
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error_occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
        {t('auth.check_email')}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">{t('auth.email_address')}</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder={t('auth.email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">{t('auth.password')}</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder={t('auth.password_placeholder_new')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          minLength={6}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm">{t('auth.confirm_password')}</Label>
        <Input
          id="signup-confirm"
          type="password"
          placeholder={t('auth.confirm_password_placeholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('auth.signing_up') : t('auth.sign_up')}
      </Button>
    </form>
  );
}
