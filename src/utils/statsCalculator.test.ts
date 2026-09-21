import { describe, it, expect, beforeAll } from 'vitest';
import { getScoreLevel, calculateStats, preparePinyin } from './statsCalculator';
import type { TypingSession, Character } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';

describe('getScoreLevel', () => {
  it.each([
    [95, 200, 'S'], [96, 210, 'S'], [100, 300, 'S'],
    [94, 200, 'A'], [95, 199, 'A'], [90, 150, 'A'], [91, 160, 'A'],
    [89, 150, 'B'], [90, 149, 'B'], [80, 100, 'B'], [81, 110, 'B'],
    [79, 100, 'C'], [80, 99, 'C'], [70, 0, 'C'], [75, 50, 'C'],
    [69, 300, 'D'], [0, 0, 'D'],
  ])('accuracy %i and speed %i grade as %s', (accuracy, speed, expected) => {
    expect(getScoreLevel(accuracy, speed).level).toBe(expected);
  });
});

function makeSession(lessonId: string, text: string, typed: string, elapsedTime: number): TypingSession {
  const content: Character[] = Array.from(text).map((char, index) => {
    const input = index < typed.length ? typed[index] : '';
    let status: CharacterStatus = CharacterStatus.PENDING;
    if (input) {
      status = input === char ? CharacterStatus.CORRECT : CharacterStatus.INCORRECT;
    }
    return { char, status, input, index };
  });
  return {
    lessonId,
    content,
    currentIndex: typed.length,
    startTime: 0,
    elapsedTime,
    isCompleted: typed.length === content.length,
    trace: [],
  };
}

describe('calculateStats', () => {
  it('computes English cpm, wpm, accuracy and duration', () => {
    const stats = calculateStats(makeSession('test-en', 'hello world', 'hello world', 60000));
    expect(stats).toMatchObject({ cpm: 11, wpm: 2, accuracy: 100, duration: 60, correctChars: 11 });
  });

  it('counts mistakes against accuracy', () => {
    const stats = calculateStats(makeSession('test-en2', 'abcd', 'abXd', 60000));
    expect(stats).toMatchObject({ correctChars: 3, incorrectChars: 1, accuracy: 75 });
  });

  it('guards against zero elapsed time', () => {
    const stats = calculateStats(makeSession('test-zero', 'abc', 'a', 0));
    expect(stats.cpm).toBe(0);
    expect(stats.wpm).toBe(0);
  });

  it('reports progress against the full content length', () => {
    expect(calculateStats(makeSession('test-prog', 'abcd', 'ab', 1000)).progress).toBe(50);
  });

  describe('Chinese keystroke weighting', () => {
    it('refuses to guess before the pinyin dictionary is loaded', () => {
      expect(() => calculateStats(makeSession('test-zh-early', '你好', '你好', 60000))).toThrow(/preparePinyin/);
    });

    describe('once pinyin is loaded', () => {
      beforeAll(() => preparePinyin());

      it('weights each Han character by its pinyin length', () => {
        // "你" = ni -> 2, "好" = hao -> 3
        const stats = calculateStats(makeSession('test-zh', '你好', '你好', 60000));
        expect(stats).toMatchObject({ effectiveKeystrokes: 5, cpm: 5, wpm: 2 });
      });

      it('stays consistent across repeated calls for the same lesson', () => {
        expect(calculateStats(makeSession('test-zh', '你好', '你', 60000)).effectiveKeystrokes).toBe(2);
        expect(calculateStats(makeSession('test-zh', '你好', '你好', 60000)).effectiveKeystrokes).toBe(5);
      });
    });
  });
});
