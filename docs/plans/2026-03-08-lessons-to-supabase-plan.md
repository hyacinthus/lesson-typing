# Lessons to Supabase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move lesson content from static frontend files to Supabase to fix anti-cheat vulnerability where submitted `totalChars` cannot be verified server-side.

**Architecture:** New `lt_lessons` table stores all lesson content. Sync script pushes local JSON files to Supabase. Frontend queries Supabase instead of fetching static files. Submit function validates character count against DB.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions), Node.js sync script, React + Zustand frontend

---

### Task 1: Create Supabase Schema for Lessons

**Files:**
- Create: `supabase/schema/06_lt_lessons.sql`

**Step 1: Write the schema SQL**

```sql
-- Lesson content table
CREATE TABLE IF NOT EXISTS lt_lessons (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  chinese_char_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for frontend queries (load by language + collection)
CREATE INDEX IF NOT EXISTS idx_lt_lessons_lang_collection
  ON lt_lessons (language, collection_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER lt_lessons_updated_at
  BEFORE UPDATE ON lt_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: everyone can read, only service_role can write
ALTER TABLE lt_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lessons"
  ON lt_lessons FOR SELECT
  USING (true);
```

**Step 2: Execute the schema**

Run: `npx supabase db push` or apply via Supabase dashboard/CLI as per project conventions.

**Step 3: Commit**

```bash
git add supabase/schema/06_lt_lessons.sql
git commit -m "feat: add lt_lessons table schema for server-side lesson storage"
```

---

### Task 2: Move Lesson Files Out of `public/`

**Step 1: Move the lessons directory**

```bash
mv public/lessons lessons
```

This moves `public/lessons/` (with all 9 language subdirectories) to `lessons/` at the project root. Files are no longer served by Vite or included in the frontend bundle.

**Step 2: Delete obsolete files**

```bash
rm lessons/index.json
rm rebuild_index.cjs
```

`index.json` is no longer needed (frontend will query Supabase). `rebuild_index.cjs` is replaced by the sync script.

**Step 3: Update CLAUDE.md**

In `CLAUDE.md`, update these sections:

Replace the **Project Layout** section:
```markdown
## Project Layout
- `src/` frontend code
- `lessons/` lesson data (synced to Supabase, not served to frontend)
- `agent_docs/` project conventions
```

Replace the **Data Maintenance** section:
```markdown
## Data Maintenance
- After editing `lessons/**/grade-*.json`, run `node scripts/sync-lessons.cjs`
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move lessons out of public/ to reduce frontend bundle size"
```

---

### Task 3: Create Sync Script

**Files:**
- Create: `scripts/sync-lessons.cjs`

**Step 1: Write the sync script**

The script traverses `lessons/` directory, reads all grade JSON files, and upserts every lesson to Supabase using the service role key.

```javascript
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env from .env or .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const lessonsDir = path.resolve(__dirname, '../lessons');

async function syncLessons() {
  const languages = fs.readdirSync(lessonsDir).filter(f =>
    fs.statSync(path.join(lessonsDir, f)).isDirectory()
  );

  const allRows = [];

  for (const language of languages) {
    const langDir = path.join(lessonsDir, language);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(langDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const collectionId = data.id; // e.g. "grade-1"

      for (const lesson of data.lessons) {
        allRows.push({
          id: lesson.id,
          language,
          collection_id: collectionId,
          title: lesson.title,
          category: lesson.category || null,
          difficulty: lesson.difficulty,
          sort_order: lesson.order,
          content: lesson.content,
          character_count: lesson.characterCount,
          chinese_char_count: lesson.chineseCharCount || 0,
        });
      }
    }
  }

  console.log(`Found ${allRows.length} lessons across ${languages.length} languages`);

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('lt_lessons')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
      process.exit(1);
    }
    console.log(`Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} lessons)`);
  }

  // Delete lessons from DB that no longer exist in files
  const localIds = allRows.map(r => r.id);
  const { data: dbLessons, error: fetchError } = await supabase
    .from('lt_lessons')
    .select('id');

  if (fetchError) {
    console.error('Error fetching existing lessons:', fetchError);
    process.exit(1);
  }

  const orphanIds = dbLessons
    .map(r => r.id)
    .filter(id => !localIds.includes(id));

  if (orphanIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('lt_lessons')
      .delete()
      .in('id', orphanIds);

    if (deleteError) {
      console.error('Error deleting orphan lessons:', deleteError);
      process.exit(1);
    }
    console.log(`Deleted ${orphanIds.length} orphaned lessons from DB`);
  }

  console.log('Sync complete!');
}

syncLessons().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
```

**Step 2: Verify dotenv is available**

Run: `npm ls dotenv` — if not installed, run `npm install --save-dev dotenv`.

**Step 3: Test the sync script**

Run: `node scripts/sync-lessons.cjs`
Expected: Outputs lesson counts and "Sync complete!"

**Step 4: Commit**

```bash
git add scripts/sync-lessons.cjs package.json package-lock.json
git commit -m "feat: add lesson sync script to push lesson data to Supabase"
```

---

### Task 4: Rewrite Frontend Lesson Loading

**Files:**
- Modify: `src/utils/lessonLoader.ts` (full rewrite)
- Modify: `src/stores/lessonStore.ts` (update loading logic)
- Modify: `src/types/lesson.types.ts` (simplify types)
- Modify: `src/pages/HomePage.tsx` (update to new loading flow)

**Step 1: Simplify lesson types**

In `src/types/lesson.types.ts`, the `LessonIndex`, `LanguageConfig`, `CollectionConfig`, and `LessonCollection` types are no longer needed (frontend no longer fetches index.json or collection files). Keep `Lesson` and `LessonMetadata`.

Replace `src/types/lesson.types.ts` with:

```typescript
/**
 * Lesson metadata (without content)
 */
export interface LessonMetadata {
  id: string;
  title: string;
  collectionTitle: string;
  category?: string;
  difficulty: number;
  characterCount: number;
  chineseCharCount: number;
  order: number;
}

/**
 * Full lesson data from Supabase lt_lessons table
 */
export interface Lesson {
  id: string;
  title: string;
  collectionTitle: string;
  collectionId: string;
  language: string;
  category?: string;
  difficulty: number;
  order: number;
  content: string;
  characterCount: number;
  chineseCharCount: number;
}
```

**Step 2: Rewrite `src/utils/lessonLoader.ts`**

Replace the entire file. The new version queries Supabase instead of fetching static files.

```typescript
import type { Lesson } from '../types';
import type { Character } from '../types/typing.types.ts';
import { CharacterStatus } from '../types/typing.types.ts';
import { supabase } from '../lib/supabase';

// Cache loaded lessons by language
const lessonsByLanguage = new Map<string, Lesson[]>();

// Map collection_id to display title (e.g. "grade-1" -> "Grade 1")
function collectionTitle(collectionId: string): string {
  const num = collectionId.replace('grade-', '');
  return `Grade ${num}`;
}

/**
 * Convert a Supabase row to a Lesson object
 */
function rowToLesson(row: Record<string, unknown>): Lesson {
  return {
    id: row.id as string,
    title: row.title as string,
    collectionTitle: collectionTitle(row.collection_id as string),
    collectionId: row.collection_id as string,
    language: row.language as string,
    category: (row.category as string) || undefined,
    difficulty: row.difficulty as number,
    order: row.sort_order as number,
    content: row.content as string,
    characterCount: row.character_count as number,
    chineseCharCount: row.chinese_char_count as number,
  };
}

/**
 * Load all lessons for a specific language from Supabase
 */
export async function loadLessonsByLanguage(language: string): Promise<Lesson[]> {
  if (lessonsByLanguage.has(language)) {
    return lessonsByLanguage.get(language)!;
  }

  const { data, error } = await supabase
    .from('lt_lessons')
    .select('*')
    .eq('language', language)
    .order('collection_id')
    .order('sort_order');

  if (error) {
    throw new Error(`Failed to load lessons for ${language}: ${error.message}`);
  }

  const lessons = (data || []).map(rowToLesson);
  lessonsByLanguage.set(language, lessons);
  return lessons;
}

/**
 * Load a single lesson by ID from Supabase
 */
export async function findLessonById(id: string): Promise<Lesson | null> {
  // Check cache first
  for (const lessons of lessonsByLanguage.values()) {
    const found = lessons.find(l => l.id === id);
    if (found) return found;
  }

  // Query DB
  const { data, error } = await supabase
    .from('lt_lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return rowToLesson(data);
}

/**
 * Get available languages from Supabase
 */
export async function getAvailableLanguages(): Promise<string[]> {
  const { data, error } = await supabase
    .from('lt_lessons')
    .select('language')
    .limit(1000);

  if (error) {
    throw new Error(`Failed to load available languages: ${error.message}`);
  }

  const unique = [...new Set((data || []).map(r => r.language as string))];
  return unique;
}

// Keep utility functions unchanged

/**
 * Convert lesson content to character array
 */
export function lessonToCharacters(content: string): Character[] {
  return Array.from(content).map((char, index) => ({
    char,
    status: index === 0 ? CharacterStatus.CURRENT : CharacterStatus.PENDING,
    input: '',
    index,
  }));
}

/**
 * Check if a character is Chinese
 */
export function isChineseCharacter(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
}

/**
 * Count lesson characters
 */
export function countLessonCharacters(content: string): {
  total: number;
  chinese: number;
} {
  const chars = Array.from(content);
  const total = chars.length;
  const chinese = chars.filter(isChineseCharacter).length;
  return { total, chinese };
}
```

**Step 3: Rewrite `src/stores/lessonStore.ts`**

The store now loads by language instead of loading all lessons. It implements the preload strategy: current language immediately, English in background if needed.

```typescript
import { create } from 'zustand';
import type { Lesson } from '../types';
import { loadLessonsByLanguage, findLessonById } from '../utils/lessonLoader';

// Map i18n language codes to lesson language IDs
const LANGUAGE_MAP: Record<string, string> = {
  'zh': 'chinese',
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',
  'en': 'english',
  'en-US': 'english',
  'en-GB': 'english',
  'es': 'spanish',
  'es-ES': 'spanish',
  'es-MX': 'spanish',
  'ja': 'japanese',
  'ja-JP': 'japanese',
  'ko': 'korean',
  'ko-KR': 'korean',
  'pt': 'portuguese',
  'pt-BR': 'portuguese',
  'pt-PT': 'portuguese',
  'fr': 'french',
  'fr-FR': 'french',
  'de': 'german',
  'de-DE': 'german',
  'it': 'italian',
  'it-IT': 'italian',
};

export function getLessonLanguage(i18nLang: string): string | undefined {
  return LANGUAGE_MAP[i18nLang] || LANGUAGE_MAP[i18nLang.split('-')[0]];
}

interface LessonStore {
  lessons: Lesson[];
  currentLesson: Lesson | null;
  isLoading: boolean;
  error: string | null;
  loadedLanguages: Set<string>;

  loadLessonsByLang: (i18nLang: string) => Promise<void>;
  preloadEnglish: () => void;
  loadLesson: (id: string) => Promise<void>;
  setCurrentLesson: (lesson: Lesson) => void;
  clearCurrentLesson: () => void;
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  currentLesson: null,
  isLoading: false,
  error: null,
  loadedLanguages: new Set(),

  loadLessonsByLang: async (i18nLang: string) => {
    const language = getLessonLanguage(i18nLang);
    if (!language) {
      set({ error: `Unsupported language: ${i18nLang}`, isLoading: false });
      return;
    }

    if (get().loadedLanguages.has(language)) return;

    set({ isLoading: true, error: null });
    try {
      const newLessons = await loadLessonsByLanguage(language);
      const existing = get().lessons.filter(l => l.language !== language);
      const loadedLanguages = new Set(get().loadedLanguages);
      loadedLanguages.add(language);
      set({ lessons: [...existing, ...newLessons], isLoading: false, loadedLanguages });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lessons',
        isLoading: false,
      });
    }
  },

  preloadEnglish: () => {
    const state = get();
    if (state.loadedLanguages.has('english')) return;

    const load = () => {
      loadLessonsByLanguage('english').then(newLessons => {
        const existing = get().lessons.filter(l => l.language !== 'english');
        const loadedLanguages = new Set(get().loadedLanguages);
        loadedLanguages.add('english');
        set({ lessons: [...existing, ...newLessons], loadedLanguages });
      }).catch(() => {
        // Silent fail for background preload
      });
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(load);
    } else {
      setTimeout(load, 2000);
    }
  },

  loadLesson: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const lesson = await findLessonById(id);
      if (lesson) {
        set({ currentLesson: lesson, isLoading: false });
      } else {
        set({ error: 'Lesson not found', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lesson',
        isLoading: false,
      });
    }
  },

  setCurrentLesson: (lesson: Lesson) => {
    set({ currentLesson: lesson });
  },

  clearCurrentLesson: () => {
    set({ currentLesson: null });
  },
}));
```

**Step 4: Update `src/pages/HomePage.tsx`**

Key changes:
- Remove `LANGUAGE_MAP` (moved to `lessonStore.ts`)
- Replace `loadLessons()` with `loadLessonsByLang(i18n.language)` + `preloadEnglish()`
- Remove `loadAllLessons` import

Replace the imports and LANGUAGE_MAP at the top (lines 1-36):

```typescript
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLessonStore, getLessonLanguage } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/auth/UserMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, ChartLine, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '../types';
```

Replace the `loadLessons` usage in the component (lines 41 and 48-50):

Change:
```typescript
const { lessons, isLoading, error, loadLessons } = useLessonStore();
```
To:
```typescript
const { lessons, isLoading, error, loadLessonsByLang, preloadEnglish } = useLessonStore();
```

Replace the `useEffect` that calls `loadLessons()`:
```typescript
useEffect(() => {
  loadLessonsByLang(i18n.language);
}, [loadLessonsByLang, i18n.language]);

useEffect(() => {
  const lang = getLessonLanguage(i18n.language);
  if (lang && lang !== 'english') {
    preloadEnglish();
  }
}, [i18n.language, preloadEnglish]);
```

Replace the `filteredLessons` useMemo (lines 70-82):
```typescript
const filteredLessons = useMemo(() => {
  const targetLessonLang = getLessonLanguage(i18n.language);
  if (!targetLessonLang) return [];
  return lessons.filter((lesson) => lesson.language === targetLessonLang);
}, [lessons, i18n.language]);
```

**Step 5: Clean up unused types**

In `src/types/lesson.types.ts`, remove `LessonIndex`, `LanguageConfig`, `CollectionConfig`, and `LessonCollection` interfaces (they are no longer imported anywhere).

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

Run: `npm run lint`
Expected: No lint errors.

**Step 7: Commit**

```bash
git add src/utils/lessonLoader.ts src/stores/lessonStore.ts src/types/lesson.types.ts src/pages/HomePage.tsx
git commit -m "feat: load lessons from Supabase instead of static files"
```

---

### Task 5: Check for Other Lesson Loader References

**Step 1: Search for any other imports of removed functions/types**

Search for: `loadAllLessons`, `loadLessonIndex`, `loadLessonCollection`, `LessonIndex`, `LessonCollection`, `LanguageConfig`, `CollectionConfig` across `src/`.

Fix any broken imports by updating to the new API (`loadLessonsByLanguage`, `findLessonById`).

**Step 2: Search for references to `/lessons/` path in frontend code**

Search for: `'/lessons/'`, `"/lessons/"`, `` `/lessons/` `` in `src/` — these would be old static file references that need updating.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit if changes were needed**

```bash
git add -A
git commit -m "fix: update remaining references to old lesson loading API"
```

---

### Task 6: Add Anti-Cheat Character Count Validation

**Files:**
- Modify: `supabase/functions/submit-practice/index.ts` (lines 74-171, anti-cheat section)

**Step 1: Add lesson lookup and character count validation**

After the session validation block (line 72) and before the anti-cheat section (line 74), add:

```typescript
    // Look up lesson from database to validate character count
    const { data: lessonData, error: lessonError } = await supabaseAdmin
      .from('lt_lessons')
      .select('character_count')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lessonData) {
      return new Response(
        JSON.stringify({ error: 'Lesson not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
```

Then after the existing speed sanity check (line 87), add:

```typescript
    // Character count validation against server-side lesson data
    if (isValid && totalChars !== lessonData.character_count) {
      isValid = false
      cheatReason = 'Character count mismatch'
    }
```

**Step 2: Deploy the function**

Run: `npx supabase functions deploy submit-practice`

**Step 3: Commit**

```bash
git add supabase/functions/submit-practice/index.ts
git commit -m "feat: validate character count against server-side lesson data in anti-cheat"
```

---

### Task 7: Final Verification & Cleanup

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds. Verify the output bundle does NOT contain lesson content (check `dist/` size or grep for lesson text).

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

**Step 3: Manual test checklist**

- [ ] App loads and shows lessons for current language
- [ ] Switching language loads that language's lessons
- [ ] English lessons preload in background (if current lang is not English)
- [ ] Lesson practice works end-to-end
- [ ] Submitting a practice result succeeds for logged-in users
- [ ] `dist/` bundle no longer contains lesson text content

**Step 4: Verify `__APP_VERSION__` reference is removed**

The old `lessonLoader.ts` used `__APP_VERSION__` for cache busting on static files. Verify this Vite define is no longer needed for lesson loading (it may still be used elsewhere — only remove if truly unused).

**Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup after lessons-to-supabase migration"
```
