-- Lesson content table
create table if not exists public.lt_lessons (
  id text primary key,
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
