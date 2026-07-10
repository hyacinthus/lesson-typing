import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { mapAuthError } from '../../lib/authErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(mapAuthError(signInError));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error_occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">{t('auth.email_address')}</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder={t('auth.email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signin-password">{t('auth.password')}</Label>
        <Input
          id="signin-password"
          type="password"
          placeholder={t('auth.password_placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('auth.signing_in') : t('auth.sign_in')}
      </Button>
    </form>
  );
}
