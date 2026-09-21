import { describe, it, expect } from 'vitest';
import { pickRandomLesson } from './pickLesson';
import type { LessonSummary } from '../types';

const summary = (id: string, language: string, collectionId: string): LessonSummary => ({
  id, title: id, language, collectionId, difficulty: 1, order: 1, characterCount: 1, cjkCharCount: 0,
});
const lessons = [
  summary('a', 'english', 'grade-1'),
  summary('b', 'english', 'grade-1'),
  summary('c', 'english', 'grade-2'),
  summary('d', 'chinese', 'grade-1'),
];

describe('pickRandomLesson', () => {
  it('prefers the given collection and excludes the current lesson', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickRandomLesson(lessons, { language: 'english', collectionId: 'grade-1', excludeId: 'a' })?.id).toBe('b');
    }
  });

  it('falls back to the whole language when the collection has no other lesson', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickRandomLesson(lessons, { language: 'english', collectionId: 'grade-2', excludeId: 'c' })?.id).toMatch(/^[ab]$/);
    }
  });

  it('picks from the whole language when no collection is given', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(pickRandomLesson(lessons, { language: 'english' })!.id);
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns null when nothing qualifies', () => {
    expect(pickRandomLesson(lessons, { language: 'french' })).toBeNull();
    expect(pickRandomLesson(lessons, { language: 'chinese', excludeId: 'd' })).toBeNull();
  });
});
