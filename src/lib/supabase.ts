import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

const supabaseUrl = CONFIG.supabase.url;
const supabaseAnonKey = CONFIG.supabase.anonKey;

if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl === 'undefined' ||
  supabaseAnonKey === 'undefined'
) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
