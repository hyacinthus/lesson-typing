-- lt_practice_logs.session_id references lt_practice_sessions with the
-- default RESTRICT, but submit-practice deletes the session right after
-- writing the log (and start-practice sweeps expired ones). Those deletes
-- failed silently and sessions piled up; the log only needs the id as a
-- reference, so let it be cleared.
alter table public.lt_practice_logs
  drop constraint if exists lt_practice_logs_session_id_fkey;
alter table public.lt_practice_logs
  add constraint lt_practice_logs_session_id_fkey
  foreign key (session_id) references public.lt_practice_sessions(id) on delete set null;

-- lt_practice_sessions.lesson_id was created as text while lt_lessons.id,
-- lt_practice_logs.lesson_id and lt_user_lesson_stats.lesson_id are uuid.
-- Align the type so joins and comparisons do not need casts.
delete from public.lt_practice_sessions where expires_at < now();
alter table public.lt_practice_sessions
  alter column lesson_id type uuid using lesson_id::uuid;

-- A session only has to outlive the run it belongs to. The old 30-minute
-- window expired mid-run on long lessons for slow typists and their result
-- was rejected. Expiry is not load-bearing for anti-cheat (submit-practice
-- bounds the claimed duration against the session's created_at in both
-- directions), so a generous fixed window is enough.
alter table public.lt_practice_sessions
  alter column expires_at set default (now() + interval '24 hours');
