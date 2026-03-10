create table if not exists public.lt_collections (
  id text not null,
  language text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (id, language)
);

alter table public.lt_collections enable row level security;

create policy "Anyone can read collections"
  on public.lt_collections for select
  using (true);
