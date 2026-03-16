import type { Lesson, Collection } from '../types';
import type { Character } from '../types/typing.types.ts';
import { CharacterStatus } from '../types/typing.types.ts';
import { supabase } from '../lib/supabase';

// Cache loaded lessons by language
const lessonsByLanguage = new Map<string, Lesson[]>();

const collectionsByLanguage = new Map<string, Collection[]>();

/**
 * Convert a Supabase row to a Lesson object
 */
function rowToLesson(row: Record<string, unknown>): Lesson {
  return {
    id: row.id as string,
    title: row.title as string,
    collectionId: row.collection_id as string,
    language: row.language as string,
    category: (row.category as string) || undefined,
    difficulty: row.difficulty as number,
    order: row.sort_order as number,
    content: row.content as string,
    characterCount: row.character_count as number,
    cjkCharCount: row.cjk_char_count as number,
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
 * Check if a character is a CJK character (Han, Hiragana, Katakana, Hangul)
 */
export function isCJKCharacter(char: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u11ff]/.test(char);
}

/**
 * Count lesson characters
 */
export function countLessonCharacters(content: string): {
  total: number;
  cjk: number;
} {
  const chars = Array.from(content);
  const total = chars.length;
  const cjk = chars.filter(isCJKCharacter).length;
  return { total, cjk };
}
