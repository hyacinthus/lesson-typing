-- Create lt_practice_logs table
create table if not exists public.lt_practice_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid not null,                     -- Links to the static lesson content (now UUIDs)
  
  -- Redundant fields for easier querying / filtering without joins
  language text not null,                      -- e.g., 'chinese', 'english'
  collection_id text not null,                 -- e.g., 'grade-3'
  
  -- Performance metrics
  cpm integer not null,                        -- Characters Per Minute (Primary speed metric)
  wpm integer not null,                        -- Words/Chinese Characters Per Minute (Auxiliary)
  accuracy numeric(5, 2) not null,             -- Accuracy percentage (e.g., 98.50)
  duration integer not null,                   -- Duration in seconds
  
  -- Detailed stats (optional but useful for analysis)
  total_chars integer,
  correct_chars integer,
  error_chars integer,
  
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_logs_user_lesson on lt_practice_logs(user_id, lesson_id);
create index if not exists idx_logs_lang_coll on lt_practice_logs(language, collection_id);
create index if not exists idx_logs_user_created on lt_practice_logs(user_id, created_at desc);

-- Enable Row Level Security (RLS)
alter table public.lt_practice_logs enable row level security;

-- Policies
create policy "Users can insert their own logs"
  on public.lt_practice_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own logs"
  on public.lt_practice_logs for select
  using (auth.uid() = user_id);
