import { useState, useRef, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { LogIn, LogOut, User, Chrome, Mail, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

type AuthModalView = 'options' | 'sign_in' | 'sign_up';

export function UserMenu() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('options');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalView('options');
  };

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-600 text-sm font-medium hover:shadow-md transition-shadow border border-gray-100"
        >
          <LogIn size={18} className="text-[#90caf9]" />
          <span>Login</span>
        </button>

        {isAuthModalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            onClick={closeAuthModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Welcome</h3>
                <button
                  onClick={closeAuthModal}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close login dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {authModalView === 'options' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      void signInWithGoogle().catch((error) => {
                        console.error('Google sign-in failed:', error);
                      });
                      closeAuthModal();
                    }}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Chrome size={18} className="text-red-500" />
                    <span>Continue with Google</span>
                  </button>
                  <button
                    onClick={() => setAuthModalView('sign_in')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Mail size={18} className="text-[#64b5f6]" />
                    <span>Login with Email</span>
                  </button>
                  <button
                    onClick={() => setAuthModalView('sign_up')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus size={18} className="text-[#64b5f6]" />
                    <span>Register with Email</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setAuthModalView('options')}
                      className="text-sm font-medium text-[#64b5f6] hover:underline"
                    >
                      Back
                    </button>
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
            </div>
          </div>
        )}
      </>
    );
  }

  const avatarUrl = user.user_metadata.avatar_url;
  const displayName = user.user_metadata.full_name || user.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white text-gray-600 text-sm font-medium hover:shadow-md transition-shadow border border-gray-100"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#90caf9] flex items-center justify-center text-white">
            <User size={16} />
          </div>
        )}
        <span className="max-w-[100px] truncate">{displayName}</span>
      </button>

      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-50 mb-1">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              void signOut().catch((error) => {
                console.error('Sign-out failed:', error);
              });
              setIsUserMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
