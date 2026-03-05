import { useState, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AuthModalView = 'options' | 'sign_in' | 'sign_up';

function GoogleLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.65z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.9 12c0-.79.14-1.55.37-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.99-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.82l3.45-3.45C17.94 1.06 15.24 0 12 0 7.31 0 3.27 2.69 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function EmailMaterialIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
    </svg>
  );
}

function RegisterMaterialIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM3.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM19.75 7.5a.75.75 0 0 0-1.5 0v2.25H16a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H22a.75.75 0 0 0 0-1.5h-2.25V7.5Z" />
    </svg>
  );
}

export function LoginDialog() {
  const { t } = useTranslation();
  const { signInWithGoogle, isLoginDialogOpen, setLoginDialogOpen } = useAuthStore();
  const [view, setView] = useState<AuthModalView>('options');

  const close = () => {
    setLoginDialogOpen(false);
    setView('options');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close();
    }
  };

  return (
    <Dialog open={isLoginDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl border-gray-100 bg-white p-5 shadow-xl sm:max-w-md">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-gray-800">{t('auth.welcome')}</DialogTitle>
        </DialogHeader>

        {view === 'options' ? (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                void signInWithGoogle().catch((error) => {
                  console.error('Google sign-in failed:', error);
                });
                close();
              }}
              className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
            >
              <GoogleLogoIcon className="size-[18px]" />
              <span>{t('auth.continue_with_google')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setView('sign_in')}
              className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
            >
              <EmailMaterialIcon className="size-[18px] text-[#5f6368]" />
              <span>{t('auth.login_with_email')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setView('sign_up')}
              className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
            >
              <RegisterMaterialIcon className="size-[18px] text-[#5f6368]" />
              <span>{t('auth.register_with_email')}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setView('options')}
                className="h-auto px-0 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/80"
              >
                {t('auth.back')}
              </Button>
              <span className="text-sm text-gray-500">
                {view === 'sign_in' ? t('auth.email_login') : t('auth.email_register')}
              </span>
            </div>
            {view === 'sign_in' ? (
              <SignInForm />
            ) : (
              <SignUpForm redirectTo={window.location.origin} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
