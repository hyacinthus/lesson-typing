import { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { LogIn, LogOut, User, Chrome, Mail, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
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

export function UserMenu() {
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
            <LogIn size={18} className="text-[#90caf9]" />
            <span>Login</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md rounded-2xl border-gray-100 bg-white p-5 shadow-xl sm:max-w-md">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-gray-800">Welcome</DialogTitle>
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
                <Chrome size={18} className="text-red-500" />
                <span>Continue with Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuthModalView('sign_in')}
                className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
              >
                <Mail size={18} className="text-[#64b5f6]" />
                <span>Login with Email</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuthModalView('sign_up')}
                className="h-auto w-full justify-start gap-3 rounded-xl border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
              >
                <UserPlus size={18} className="text-[#64b5f6]" />
                <span>Register with Email</span>
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
                  Back
                </Button>
                <span className="text-sm text-gray-500">
                  {authModalView === 'sign_in' ? 'Email Login' : 'Email Register'}
                </span>
              </div>
              <Auth
                supabaseClient={supabase}
                providers={[]}
                showLinks={false}
                view={authModalView}
                redirectTo={window.location.origin}
                appearance={{ theme: ThemeSupa }}
              />
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
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
