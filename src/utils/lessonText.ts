import type { Character } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';

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
  return /[一-鿿㐀-䶿豈-﫿぀-ゟ゠-ヿ가-힯ᄀ-ᇿ]/.test(char);
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
