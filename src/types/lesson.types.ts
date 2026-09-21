/**
 * Lesson row without its text. The home page and "next lesson" picker only
 * need this; the content is fetched when a lesson is opened.
 */
export interface LessonSummary {
  id: string;
  title: string;
  collectionId: string;
  language: string;
  category?: string;
  difficulty: number;
  order: number;
  characterCount: number;
  cjkCharCount: number;
}

/**
 * Full lesson data from Supabase lt_lessons table
 */
export interface Lesson extends LessonSummary {
  content: string;
}

export interface Collection {
  id: string;
  name: string;
  sortOrder: number;
}
