import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isLoggingIn: boolean;
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
let lastFetchedUserId: string | null = null;
let inProgressFetch: Promise<Profile | null> | null = null;

const fetchOrCreateProfile = async (user: User): Promise<Profile | null> => {
  // If we are already fetching for this specific user, return the existing promise
  if (lastFetchedUserId === user.id && inProgressFetch) {
    return inProgressFetch;
  }

  lastFetchedUserId = user.id;
  inProgressFetch = (async () => {
    console.log('Fetching profile for user:', user.id);
    try {
      // Try to fetch existing profile
      const { data, error } = await supabase
        .from('lt_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        console.log('Profile found:', data);
        return data as Profile;
      }

      // If not found, create one from metadata
      if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.details?.includes('0 rows'))) {
        console.log('Profile not found, creating new one...');
        const newProfile = {
          id: user.id,
          nickname: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString(),
        };

        const { data: createdProfile, error: insertError } = await supabase
          .from('lt_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          return null;
        }
        console.log('Profile created successfully:', createdProfile);
        return createdProfile as Profile;
      }

      console.error('Error fetching profile:', error);
      return null;
    } catch (err) {
      console.error('Unexpected error in fetchOrCreateProfile:', err);
      return null;
    } finally {
      // Clear the promise after a delay to allow future refreshes if necessary
      // but catch the initial flood of calls
      setTimeout(() => {
        if (lastFetchedUserId === user.id) {
          inProgressFetch = null;
        }
      }, 2000);
    }
  })();

  return inProgressFetch;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isLoggingIn: false,
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
    console.log('Starting signOut process...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      } else {
        console.log('Supabase signOut successful');
      }
    } catch (err) {
      console.error('Unexpected error during signOut:', err);
    } finally {
      console.log('Clearing local state...');
      // Always clear local state regardless of server response
      set({ user: null, session: null, profile: null });
      console.log('State cleared');
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await fetchOrCreateProfile(user);
    // Ensure user hasn't changed/logged out during fetch
    if (get().user?.id === user.id) {
      set({ profile });
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
      console.log('AuthState changed:', _event, user?.id);
      set({ session, user, isLoading: false });

      if (user) {
        fetchOrCreateProfile(user).then((profile) => {
          // Ensure user hasn't changed/logged out during fetch
          if (get().user?.id === user.id) {
            set({ profile });
          }
        });
      } else {
        set({ profile: null });
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
      fetchOrCreateProfile(user).then((profile) => {
        if (get().user?.id === user.id) {
          set({ profile });
        }
      });
    }
  },

  cleanup: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  },
}));
