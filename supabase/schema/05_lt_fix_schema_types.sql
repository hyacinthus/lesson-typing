-- Fix lesson_id type mismatch
-- lesson_id in lt_practice_logs and lt_user_lesson_stats was incorrectly set to UUID,
-- but the frontend passes string IDs (e.g. "lesson-typing-1").
-- This caused the Edge Functions to fail with a 504 Gateway Timeout during inserts.

ALTER TABLE public.lt_practice_logs ALTER COLUMN lesson_id TYPE text;
ALTER TABLE public.lt_user_lesson_stats ALTER COLUMN lesson_id TYPE text;

-- Add missing collection_id column
-- submit-practice edge function passes collection_id but it was missing from the table.
ALTER TABLE public.lt_practice_logs ADD COLUMN IF NOT EXISTS collection_id text;
