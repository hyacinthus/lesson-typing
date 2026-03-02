-- Create lt_profiles table
create table if not exists public.lt_profiles (
  id uuid references auth.users not null primary key,
  nickname text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.lt_profiles enable row level security;

-- Policies for lt_profiles
create policy "Users can view their own profile" 
  on public.lt_profiles for select 
  using (auth.uid() = id);

create policy "Users can insert their own profile" 
  on public.lt_profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.lt_profiles for update 
  using (auth.uid() = id);

-- Trigger to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_lt_profiles_updated
  before update on public.lt_profiles
  for each row execute procedure public.handle_updated_at();
