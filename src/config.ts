/**
 * Project configuration centralized from environment variables.
 * In Vite, variables starting with VITE_ are exposed to the client.
 */
export const CONFIG = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },
  // Add other environment-specific configurations here
};

// Validation to help debugging during development
if (import.meta.env.DEV) {
  if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    console.warn(
      'Supabase credentials missing. Please check your .env file. ' +
      'Authentication features will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
  }
}
