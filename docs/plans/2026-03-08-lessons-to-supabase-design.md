# Design: Migrate Lessons to Supabase

## Problem

The anti-cheat system in `submit-practice` cannot verify whether submitted `totalChars` matches the actual lesson content, because lesson data only exists in the frontend bundle. A user could submit fabricated character counts to inflate stats.

## Solution

Move lesson content to Supabase. Frontend loads lessons via Supabase queries. Submit function validates character count against the database.

## Database

New table `lt_lessons`:

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | Existing lesson UUID |
| language | TEXT NOT NULL | e.g. `english`, `chinese` |
| collection_id | TEXT NOT NULL | e.g. `grade-1` |
| title | TEXT NOT NULL | Lesson title |
| category | TEXT | e.g. `Fable`, `Story` |
| difficulty | INTEGER | Difficulty level |
| sort_order | INTEGER | Display order |
| content | TEXT NOT NULL | Full lesson text |
| character_count | INTEGER NOT NULL | Character count |
| chinese_char_count | INTEGER DEFAULT 0 | Chinese character count |

- RLS: everyone can SELECT, only service_role can write
- Index: `(language, collection_id)` composite

## Sync Script

- New script: `scripts/sync-lessons.cjs`
- Traverses `lessons/` directory (moved from `public/lessons/`)
- Upserts all lessons to Supabase using service_role key
- Replaces `rebuild_index.cjs` (deleted along with `public/lessons/index.json`)
- CLAUDE.md updated: "After editing lessons, run `node scripts/sync-lessons.cjs`"

## Frontend Changes

### lessonLoader.ts
- Remove file fetch logic, use `supabase.from('lt_lessons').select(...)`
- Available languages/collections: `SELECT DISTINCT language, collection_id FROM lt_lessons`
- Load collection: `SELECT * FROM lt_lessons WHERE language = ? AND collection_id = ? ORDER BY sort_order`

### lessonStore.ts — Loading Strategy
1. Immediately load current language
2. If current language is not English, background-load English on idle (`requestIdleCallback` / `setTimeout`)
3. Other languages loaded on demand when user navigates to them

## File Migration

- `public/lessons/` → `lessons/` (project root)
- Delete `public/lessons/index.json` and `rebuild_index.cjs`
- Lessons no longer included in frontend build bundle

## Anti-Cheat Enhancement

In `submit-practice/index.ts`:
- Query `lt_lessons` for the submitted `lesson_id`
- Compare submitted `totalChars` against stored `character_count`
- Mismatch → mark `is_valid = false`

## Unchanged

- Lesson data format (JSON structure within files)
- Existing `lt_practice_logs`, `lt_user_lesson_stats` tables
- Authentication flow
