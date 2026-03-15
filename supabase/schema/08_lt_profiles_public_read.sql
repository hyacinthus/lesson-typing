-- Allow public read access to lt_profiles for leaderboard display
-- Previously only users could view their own profile

drop policy if exists "Users can view their own profile" on public.lt_profiles;

create policy "Anyone can view profiles"
  on public.lt_profiles for select
  using (true);
