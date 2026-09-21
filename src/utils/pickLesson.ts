import type { LessonSummary } from '../types';

interface PickOptions {
  language: string;
  /** Preferred collection; falls back to the whole language when it has no candidate. */
  collectionId?: string | null;
  /** Lesson to avoid (the one being practiced). */
  excludeId?: string;
}

/**
 * Pick a random lesson of a language, preferring the given collection.
 * Returns null when there is no candidate.
 */
export function pickRandomLesson(lessons: LessonSummary[], { language, collectionId, excludeId }: PickOptions): LessonSummary | null {
  const candidates = lessons.filter(l => l.language === language && l.id !== excludeId);
  const sameCollection = collectionId ? candidates.filter(l => l.collectionId === collectionId) : [];
  const pool = sameCollection.length > 0 ? sameCollection : candidates;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
