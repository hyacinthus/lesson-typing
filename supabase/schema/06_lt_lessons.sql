-- Ensure handle_updated_at() exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Fix lesson_id back to uuid (was incorrectly changed to text in 05)
alter table public.lt_practice_logs alter column lesson_id type uuid using lesson_id::uuid;
alter table public.lt_user_lesson_stats alter column lesson_id type uuid using lesson_id::uuid;

-- Lesson content table
create table if not exists public.lt_lessons (
  id uuid primary key,
  language text not null,
  collection_id text not null,
  title text not null,
  category text,
  difficulty integer not null default 1,
  sort_order integer not null default 0,
  content text not null,
  character_count integer not null,
  chinese_char_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for frontend queries (load by language + collection)
create index if not exists idx_lt_lessons_lang_collection
  on public.lt_lessons (language, collection_id);

-- Auto-update updated_at
create trigger lt_lessons_updated_at
  before update on public.lt_lessons
  for each row execute procedure public.handle_updated_at();

-- RLS: everyone can read, only service_role can write
alter table public.lt_lessons enable row level security;

create policy "Anyone can read lessons"
  on public.lt_lessons for select
  using (true);
