import type { Lesson, LessonSummary, Collection } from '../types';
import { supabase } from '../lib/supabase';
import { preparePinyin } from './statsCalculator';

// Caches hold the in-flight promise, so concurrent callers (e.g. the early
// kick-off in main.tsx and the LangLayout effect) share one request.
const lessonsByLanguage = new Map<string, Promise<LessonSummary[]>>();

const collectionsByLanguage = new Map<string, Promise<Collection[]>>();

// Full lessons (with content) by id, fetched when a lesson is opened
const lessonsById = new Map<string, Promise<Lesson | null>>();

/** Memoize by key, evicting on failure so a transient error can be retried. */
function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = load().catch(err => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
}

const SUMMARY_COLUMNS =
  'id, title, collection_id, language, category, difficulty, sort_order, character_count, cjk_char_count';

function rowToSummary(row: Record<string, unknown>): LessonSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    collectionId: row.collection_id as string,
    language: row.language as string,
    category: (row.category as string) || undefined,
    difficulty: row.difficulty as number,
    order: row.sort_order as number,
    characterCount: row.character_count as number,
    cjkCharCount: row.cjk_char_count as number,
  };
}

/**
 * Convert a Supabase row to a Lesson object
 */
function rowToLesson(row: Record<string, unknown>): Lesson {
  return { ...rowToSummary(row), content: row.content as string };
}

/**
 * Load the summaries of all lessons for a language. The text itself is left
 * out: a language has ~220 lessons and hundreds of KB of content, and only
 * the one being practiced is ever needed (see findLessonById).
 */
export function loadLessonsByLanguage(language: string): Promise<LessonSummary[]> {
  return cached(lessonsByLanguage, language, async () => {
    const { data, error } = await supabase
      .from('lt_lessons')
      .select(SUMMARY_COLUMNS)
      .eq('language', language)
      .order('collection_id')
      .order('sort_order');

    if (error) {
      throw new Error(`Failed to load lessons for ${language}: ${error.message}`);
    }
    return (data || []).map(rowToSummary);
  });
}

export function loadCollectionsByLanguage(language: string): Promise<Collection[]> {
  return cached(collectionsByLanguage, language, async () => {
    const { data, error } = await supabase
      .from('lt_collections')
      .select('id, name, sort_order')
      .eq('language', language)
      .order('sort_order');

    if (error) {
      throw new Error(`Failed to load collections for ${language}: ${error.message}`);
    }
    return (data || []).map(row => ({
      id: row.id as string,
      name: row.name as string,
      sortOrder: row.sort_order as number,
    }));
  });
}

/**
 * Load a single lesson by ID from Supabase
 */
export function findLessonById(id: string): Promise<Lesson | null> {
  return cached(lessonsById, id, async () => {
    const { data, error } = await supabase
      .from('lt_lessons')
      .select(`${SUMMARY_COLUMNS}, content`)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load lesson ${id}: ${error.message}`);
    }
    if (!data) return null;

    const lesson = rowToLesson(data);
    // Chinese stats need the pinyin dictionary; a lesson counts as loaded
    // only once both are here, so the typing engine never sees it missing.
    if (lesson.language === 'chinese') {
      await preparePinyin();
    }
    return lesson;
  });
}


// Titles resolved for practice logs (any language), cached across calls.
const lessonTitleCache = new Map<string, string>();

/**
 * Resolve lesson titles for a set of lesson ids with one batched query.
 */
export async function findLessonTitlesByIds(ids: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const missing: string[] = [];

  for (const id of new Set(ids)) {
    const cached = lessonTitleCache.get(id);
    if (cached !== undefined) {
      titles.set(id, cached);
      continue;
    }
    missing.push(id);
  }

  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('lt_lessons')
      .select('id, title')
      .in('id', missing);
    if (error) {
      console.error('Failed to fetch lesson titles:', error);
    } else if (data) {
      for (const row of data) {
        const id = row.id as string;
        const title = row.title as string;
        lessonTitleCache.set(id, title);
        titles.set(id, title);
      }
      // Negative-cache ids the query did not return (deleted lessons) so
      // they are not re-queried on every call.
      for (const id of missing) {
        if (!lessonTitleCache.has(id)) {
          lessonTitleCache.set(id, '');
        }
      }
    }
  }

  return titles;
}
