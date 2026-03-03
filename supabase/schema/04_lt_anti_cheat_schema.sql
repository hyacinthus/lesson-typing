-- Create lt_practice_sessions table
create table if not exists public.lt_practice_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id text not null,                     -- Links to the static lesson content
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 minutes')
);

-- Index for efficient session dedup/cleanup queries
create index if not exists idx_sessions_user_lesson on lt_practice_sessions(user_id, lesson_id);

-- Enable RLS for lt_practice_sessions
alter table public.lt_practice_sessions enable row level security;

-- Only users can see their own sessions
create policy "Users can view their own sessions"
  on public.lt_practice_sessions for select
  using (auth.uid() = user_id);

-- Note: Inserting into lt_practice_sessions is done via Edge Function (service_role)
-- or we can allow users to insert their own if we don't fully block it, but since
-- 'start-practice' function will do it, we don't need an INSERT policy for the public.

-- Modify lt_practice_logs
alter table public.lt_practice_logs 
add column if not exists session_id uuid references public.lt_practice_sessions(id),
add column if not exists trace jsonb,
add column if not exists is_valid boolean default true;

-- Drop existing INSERT policies that allow clients to write directly
drop policy if exists "Users can insert their own logs" on public.lt_practice_logs;
drop policy if exists "Users can insert/update their own stats" on public.lt_user_lesson_stats;

-- (Optional but recommended) We only allow inserts via Edge Functions, which use the service_role key.
-- Service role bypasses RLS, so no new INSERT policies are needed for public/authenticated users.
