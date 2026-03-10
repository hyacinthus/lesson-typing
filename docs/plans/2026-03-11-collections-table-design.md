# Collections Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store collection names in a dedicated `lt_collections` DB table so the filter dropdown shows localized names instead of hardcoded English.

**Architecture:** New `lt_collections` table with composite PK `(id, language)` stores localized display names. Sync script reads `title` from lesson JSON files and upserts collections alongside lessons. Frontend fetches collections separately from lessons — no join needed. `collectionTitle` removed from `Lesson` type.

**Tech Stack:** Supabase (Postgres), React, Zustand, TypeScript

---

### Task 1: Schema SQL file

**Files:**
- Create: `supabase/schema/07_lt_collections.sql`

**Step 1: Write the schema file**

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/schema/07_lt_collections.sql
git commit -m "feat: add lt_collections schema for localized collection names"
```

> User will execute this SQL manually against Supabase.

---

### Task 2: Update sync script to upsert collections

**Files:**
- Modify: `scripts/sync-lessons.cjs`

**Step 1: Add collection extraction to sync loop**

In the `syncLessons()` function, after building `allRows`, also build a `allCollections` array. For each JSON file, extract:
- `id` from `data.id` (e.g. `"grade-1"`)
- `language` from the folder name
- `name` from `data.title` (e.g. `"小学一年级"`)
- `sort_order` extracted from filename number (e.g. `grade-1.json` → `1`)

Add a new upsert block after the lessons upsert that upserts `allCollections` into `lt_collections` with `onConflict: 'id,language'`.

**Step 2: Run sync to verify**

```bash
npm run sync
```

Expected: "Upserted N collections" message, no errors.

**Step 3: Commit**

```bash
git add scripts/sync-lessons.cjs
git commit -m "feat: sync collection names from lesson JSON to lt_collections"
```

---

### Task 3: Add Collection type and loader function

**Files:**
- Modify: `src/types/lesson.types.ts` — remove `collectionTitle` from both interfaces
- Modify: `src/utils/lessonLoader.ts` — remove `collectionTitle()`, add `loadCollectionsByLanguage()`

**Step 1: Update `lesson.types.ts`**

Remove `collectionTitle: string;` from both `LessonMetadata` (line 7) and `Lesson` (line 21).

Add new interface:

```typescript
export interface Collection {
  id: string;
  name: string;
  sortOrder: number;
}
```

**Step 2: Update `lessonLoader.ts`**

- Delete `collectionTitle()` function (lines 9-13)
- Remove `collectionTitle` field from `rowToLesson()` (line 22)
- Add new function:

```typescript
const collectionsByLanguage = new Map<string, Collection[]>();

export async function loadCollectionsByLanguage(language: string): Promise<Collection[]> {
  if (collectionsByLanguage.has(language)) {
    return collectionsByLanguage.get(language)!;
  }

  const { data, error } = await supabase
    .from('lt_collections')
    .select('id, name, sort_order')
    .eq('language', language)
    .order('sort_order');

  if (error) {
    throw new Error(`Failed to load collections for ${language}: ${error.message}`);
  }

  const collections = (data || []).map(row => ({
    id: row.id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
  }));
  collectionsByLanguage.set(language, collections);
  return collections;
}
```

**Step 3: Build to check for type errors**

```bash
npm run build
```

Expected: Type errors in files that still reference `collectionTitle` — that's expected, fixed in next tasks.

**Step 4: Commit**

```bash
git add src/types/lesson.types.ts src/utils/lessonLoader.ts
git commit -m "feat: add Collection type and loadCollectionsByLanguage loader"
```

---

### Task 4: Add collections to Zustand store

**Files:**
- Modify: `src/stores/lessonStore.ts`

**Step 1: Update store**

- Import `loadCollectionsByLanguage` and `Collection` type
- Add `collections: Collection[]` to state
- Modify `loadLessonsByLang` to also fetch collections in parallel with lessons (using `Promise.all`)
- Collections replace (not merge) on language switch since they're language-specific

Updated `loadLessonsByLang`:

```typescript
loadLessonsByLang: async (i18nLang: string) => {
  const language = getLessonLanguage(i18nLang);
  if (!language) {
    set({ error: `Unsupported language: ${i18nLang}`, isLoading: false });
    return;
  }

  if (get().loadedLanguages.has(language)) return;

  set({ isLoading: true, error: null });
  try {
    const [newLessons, collections] = await Promise.all([
      loadLessonsByLanguage(language),
      loadCollectionsByLanguage(language),
    ]);
    const existing = get().lessons.filter(l => l.language !== language);
    const loadedLanguages = new Set(get().loadedLanguages);
    loadedLanguages.add(language);
    set({ lessons: [...existing, ...newLessons], collections, isLoading: false, loadedLanguages });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Failed to load lessons',
      isLoading: false,
    });
  }
},
```

**Step 2: Commit**

```bash
git add src/stores/lessonStore.ts
git commit -m "feat: load collections into store alongside lessons"
```

---

### Task 5: Update HomePage to use collections from store

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Step 1: Replace derived collections with store collections**

- Import `Collection` if needed
- Get `collections` from `useLessonStore()` (line 16)
- Delete the `collections` useMemo block (lines 57-73) — no longer needed
- Update `currentCollectionId` useMemo to use store collections:

```typescript
const currentCollectionId = useMemo(() => {
  if (selectedCollection && collections.some(c => c.id === selectedCollection)) {
    return selectedCollection;
  }
  return collections.length > 0 ? collections[0].id : null;
}, [collections, selectedCollection]);
```

- Update filter dropdown to render `collection.name`:

```tsx
{collections.map((collection) => (
  <SelectItem key={collection.id} value={collection.id}>
    {collection.name}
  </SelectItem>
))}
```

(Both desktop and mobile dropdowns.)

- Fix `handleNextLesson` (line 106): change `l.collectionTitle === activeLesson.collectionTitle` to `l.collectionId === activeLesson.collectionId`

**Step 2: Build and verify**

```bash
npm run build
```

Expected: no errors related to HomePage.

**Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "fix: use localized collection names from DB in filter dropdown"
```

---

### Task 6: Update LessonList and LessonCard

**Files:**
- Modify: `src/components/lesson/LessonList.tsx`
- Modify: `src/components/lesson/LessonCard.tsx`

**Step 1: Update LessonList.tsx**

- Import `useLessonStore` to get `collections`
- Change `groupedLessons` to group by `collectionId` instead of `collectionTitle`
- Look up collection name from store collections for display:

```typescript
const { collections } = useLessonStore();
const collectionNameMap = useMemo(() => {
  const map = new Map<string, string>();
  collections.forEach(c => map.set(c.id, c.name));
  return map;
}, [collections]);

const groupedLessons = useMemo(() => {
  const groups: { collectionId: string; lessons: Lesson[] }[] = [];
  filteredLessons.forEach((lesson) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.collectionId === lesson.collectionId) {
      lastGroup.lessons.push(lesson);
    } else {
      groups.push({ collectionId: lesson.collectionId, lessons: [lesson] });
    }
  });
  return groups;
}, [filteredLessons]);
```

Display: `{collectionNameMap.get(group.collectionId) ?? group.collectionId}`

**Step 2: Update LessonCard.tsx**

Remove `{lesson.collectionTitle}` reference (line 21). Replace with collection name passed as prop or looked up from store. Simplest: add an optional `collectionName` prop passed from LessonList.

In `LessonCard`:
```typescript
interface LessonCardProps {
  lesson: Lesson;
  stats?: LessonStats;
  collectionName?: string;
  onSelect: () => void;
}
```

Display: `{collectionName ?? lesson.collectionId}`

**Step 3: Build**

```bash
npm run build
```

Expected: clean build, no type errors.

**Step 4: Commit**

```bash
git add src/components/lesson/LessonList.tsx src/components/lesson/LessonCard.tsx
git commit -m "fix: use collection names from DB in LessonList and LessonCard"
```

---

### Task 7: Remove i18n `collection_grade` key (cleanup)

**Files:**
- Modify: `src/i18n.ts` — remove `collection_grade` if it was added; verify no leftover references

**Step 1: Search for any remaining `collectionTitle` references**

```bash
grep -r "collectionTitle" src/
```

Expected: no results (all removed).

**Step 2: Final build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit if any cleanup needed**

---

### Task 8: Manual verification

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Verify in browser**

- Switch language to Chinese → filter shows "小学一年级" etc.
- Switch to Japanese → filter shows "1年生" etc.
- Switch to English → filter shows "Grade 1" etc.
- Select a collection → lessons filter correctly
- Click Start → practice starts from selected collection
