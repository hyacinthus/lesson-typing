-- Create lt_user_lesson_stats table (Only for 100% accuracy runs)
create table if not exists public.lt_user_lesson_stats (
  user_id uuid references auth.users not null,
  lesson_id uuid not null,                     -- Links to static lesson ID
  
  -- Best performance (only 100% accuracy runs qualify)
  best_cpm integer default 0,                  -- Characters Per Minute
  best_wpm integer default 0,                  -- Words Per Minute (Auxiliary)
  
  achieved_at timestamptz default now(),       -- When this best score was achieved
  
  primary key (user_id, lesson_id)             -- Composite PK ensures one record per user per lesson
);

-- Indexes
create index if not exists idx_stats_user on lt_user_lesson_stats(user_id);
create index if not exists idx_stats_lesson_cpm on lt_user_lesson_stats(lesson_id, best_cpm desc); -- For leaderboards

-- Enable Row Level Security (RLS)
alter table public.lt_user_lesson_stats enable row level security;

-- Policies
create policy "Users can insert/update their own stats"
  on public.lt_user_lesson_stats for all
  using (auth.uid() = user_id);

create policy "Everyone can view stats (for leaderboards)"
  on public.lt_user_lesson_stats for select
  using (true);  -- Publicly readable for rankings
