-- One round trip for the lesson leaderboard: the top N by best_cpm with
-- nicknames joined in, plus the calling user's own row and rank when they
-- are outside the top N. Replaces four sequential client queries.
create or replace function public.lt_lesson_leaderboard(p_lesson_id uuid, p_limit integer default 10)
returns table (
  rank integer,
  user_id uuid,
  nickname text,
  best_cpm integer,
  best_wpm integer,
  is_current_user boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select
      rank() over (order by s.best_cpm desc, s.achieved_at asc)::integer as rank,
      s.user_id,
      s.best_cpm,
      s.best_wpm,
      coalesce(s.user_id = auth.uid(), false) as is_current_user
    from public.lt_user_lesson_stats s
    where s.lesson_id = p_lesson_id
  ),
  kept as (
    select * from ranked
    where rank <= p_limit or is_current_user
  )
  select k.rank, k.user_id, p.nickname, k.best_cpm, k.best_wpm, k.is_current_user
  from kept k
  left join public.lt_profiles p on p.id = k.user_id
  order by k.rank;
$$;

grant execute on function public.lt_lesson_leaderboard(uuid, integer) to anon, authenticated;
