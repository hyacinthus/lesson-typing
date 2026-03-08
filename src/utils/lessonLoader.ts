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
