import { useState, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AuthModalView = 'options' | 'sign_in' | 'sign_up';

function GoogleLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.21 7.21 0 0 1 4.9 12c0-.79.14-1.55.37-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.82l3.45-3.45C17.94 1.06 15.24 0 12 0 7.31 0 3.27 2.69 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
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
      <path d="M15 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM7 12V9H4V7h3V4h2v3h3v2H9v3H7Zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
    </svg>
  );
}

export function UserMenu() {
  const { t } = useTranslation();
  const { user, isLoading, signInWithGoogle, signOut } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('options');

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalView('options');
  };

  const handleAuthModalOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
      return;
    }
    setIsAuthModalOpen(true);
  };

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <Dialog open={isAuthModalOpen} onOpenChange={handleAuthModalOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 rounded-full border-gray-100 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm hover:bg-white hover:shadow-md"
          >
            <span>{t('auth.login')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md rounded-2xl border-gray-100 bg-white p-5 shadow-xl sm:max-w-md">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-gray-800">{t('auth.welcome')}</DialogTitle>
          </DialogHeader>

          {authModalView === 'options' ? (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => {
                  void signInWithGoogle().catch((error) => {
                    console.error('Google sign-in failed:', error);
                  });
                  closeAuthModal();
                }}
                className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
              >
                <GoogleLogoIcon className="size-[18px]" />
                <span>{t('auth.continue_with_google')}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuthModalView('sign_in')}
                className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
              >
                <EmailMaterialIcon className="size-[18px] text-[#5f6368]" />
                <span>{t('auth.login_with_email')}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuthModalView('sign_up')}
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
                  onClick={() => setAuthModalView('options')}
                  className="h-auto px-0 text-sm font-medium text-[#64b5f6] hover:bg-transparent hover:text-[#42a5f5]"
                >
                  {t('auth.back')}
                </Button>
                <span className="text-sm text-gray-500">
                  {authModalView === 'sign_in' ? t('auth.email_login') : t('auth.email_register')}
                </span>
              </div>
              {authModalView === 'sign_in' ? (
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

  const avatarUrl = user.user_metadata.avatar_url;
  const displayName = user.user_metadata.full_name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-full border-gray-100 bg-white p-1 pr-3 text-sm font-medium text-gray-600 shadow-sm hover:bg-white hover:shadow-md"
        >
          <Avatar className="size-7">
            <AvatarImage src={avatarUrl} alt="avatar" className="object-cover" />
            <AvatarFallback className="bg-[#90caf9] text-white">
              <User size={16} />
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[100px] truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl border-gray-100 bg-white py-2">
        <DropdownMenuLabel className="truncate text-xs text-gray-400">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOut().catch((error) => {
              console.error('Sign-out failed:', error);
            });
          }}
          className="gap-3"
        >
          <LogOut size={18} />
          <span>{t('auth.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
