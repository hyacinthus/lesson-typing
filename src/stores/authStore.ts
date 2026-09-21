import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoaded: boolean;
  isLoggingIn: boolean;
  isLoginDialogOpen: boolean;
  setLoginDialogOpen: (open: boolean) => void;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  cleanup: () => void;
  refreshProfile: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

// Deduplicates the initial burst of profile requests (getSession plus the
// auth-state event both fire on startup).
let inFlight: { userId: string; promise: Promise<Profile | null> } | null = null;

// Profiles are created by a database trigger on sign-up (see
// supabase/schema/11_lt_profiles_auto_create.sql), so the client only reads.
const fetchProfile = (user: User): Promise<Profile | null> => {
  if (inFlight?.userId === user.id) {
    return inFlight.promise;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('lt_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return (data as Profile | null) ?? null;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      return null;
    } finally {
      if (inFlight?.userId === user.id) {
        inFlight = null;
      }
    }
  })();

  inFlight = { userId: user.id, promise };
  return promise;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoaded: false,
  isLoggingIn: false,
  isLoginDialogOpen: false,
  setLoginDialogOpen: (open) => set({ isLoginDialogOpen: open }),
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),

  signInWithGoogle: async () => {
    set({ isLoggingIn: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      set({ isLoggingIn: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (err) {
      console.error('Unexpected error during signOut:', err);
    } finally {
      // Always clear local state regardless of server response
      set({ user: null, session: null, profile: null, isProfileLoaded: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await fetchProfile(user);
    // Ensure user hasn't changed/logged out during fetch
    if (get().user?.id === user.id) {
      set({ profile, isProfileLoaded: true });
    }
  },

  initialize: async () => {
    set({ isLoading: true });

    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      set({ session, user, isLoading: false });

      if (user) {
        fetchProfile(user).then((profile) => {
          // Ensure user hasn't changed/logged out during fetch
          if (get().user?.id === user.id) {
            set({ profile, isProfileLoaded: true });
          }
        });
      } else {
        set({ profile: null, isProfileLoaded: false });
      }
    });
    authSubscription = subscription;

    // Get initial session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      set({ isLoading: false });
      throw error;
    }

    const user = session?.user ?? null;
    set({ session, user, isLoading: false });
    
    if (user) {
      fetchProfile(user).then((profile) => {
        if (get().user?.id === user.id) {
          set({ profile, isProfileLoaded: true });
        }
      });
    } else {
      set({ profile: null, isProfileLoaded: false });
    }
  },

  cleanup: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  },
}));
