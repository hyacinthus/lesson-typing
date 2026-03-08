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
