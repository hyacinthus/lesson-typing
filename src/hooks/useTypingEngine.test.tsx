// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingEngine } from './useTypingEngine';
import { lessonToCharacters } from '../utils/lessonText';
import { CharacterStatus } from '../types/typing.types';

function setup(text: string) {
  const onStart = vi.fn();
  const onComplete = vi.fn();
  const hook = renderHook(() =>
    useTypingEngine({
      initialContent: lessonToCharacters(text),
      lessonId: 'lesson-1',
      onStart,
      onComplete,
    })
  );
  return { ...hook, onStart, onComplete };
}

describe('useTypingEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts pristine: no clock, first character current', () => {
    const { result } = setup('ab');
    expect(result.current.session.startTime).toBeNull();
    expect(result.current.stats.duration).toBe(0);
    expect(result.current.session.content[0].status).toBe(CharacterStatus.CURRENT);
    expect(result.current.session.content[1].status).toBe(CharacterStatus.PENDING);
  });

  it('marks characters correct or incorrect and advances the cursor', () => {
    const { result } = setup('abc');
    act(() => result.current.handleTextInput('a'));
    act(() => result.current.handleTextInput('x'));
    const [a, b, c] = result.current.session.content;
    expect(a.status).toBe(CharacterStatus.CORRECT);
    expect(b.status).toBe(CharacterStatus.INCORRECT);
    expect(b.input).toBe('x');
    expect(c.status).toBe(CharacterStatus.CURRENT);
    expect(result.current.session.currentIndex).toBe(2);
    expect(result.current.stats).toMatchObject({ totalCharacters: 2, correctChars: 1, incorrectChars: 1, accuracy: 50 });
  });

  it('starts the clock at the first keystroke and records a trace entry per character', () => {
    const { result } = setup('abcd');
    act(() => result.current.handleTextInput('a'));
    expect(result.current.session.startTime).toBe(Date.now());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.handleTextInput('bc'));
    expect(result.current.session.trace).toEqual([0, 1000, 1000]);
  });

  it('accepts an IME commit of several characters at once', () => {
    const { result } = setup('你好，世界');
    act(() => result.current.handleTextInput('你好'));
    expect(result.current.session.currentIndex).toBe(2);
    act(() => result.current.handleTextInput('，世界'));
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.stats.accuracy).toBe(100);
  });

  it('delete steps back one character and restores its pending state', () => {
    const { result } = setup('abc');
    act(() => result.current.handleTextInput('a'));
    act(() => result.current.handleTextInput('b'));
    act(() => result.current.handleDelete());
    expect(result.current.session.currentIndex).toBe(1);
    expect(result.current.session.content[1].status).toBe(CharacterStatus.CURRENT);
    expect(result.current.session.content[1].input).toBe('');
    expect(result.current.session.content[2].status).toBe(CharacterStatus.PENDING);
    // Deleting never removes trace entries.
    expect(result.current.session.trace).toHaveLength(2);
  });

  it('ignores delete at the start and input after completion', () => {
    const { result } = setup('a');
    act(() => result.current.handleDelete());
    expect(result.current.session.currentIndex).toBe(0);
    act(() => result.current.handleTextInput('a'));
    expect(result.current.isCompleted).toBe(true);
    act(() => result.current.handleTextInput('b'));
    act(() => result.current.handleDelete());
    expect(result.current.session.currentIndex).toBe(1);
    expect(result.current.isCompleted).toBe(true);
  });

  it('fires onStart once at the first committed character, not on a provisional start', () => {
    const { result, onStart } = setup('ab');
    act(() => result.current.markInputStart());
    expect(onStart).not.toHaveBeenCalled();
    act(() => result.current.handleTextInput('a'));
    act(() => result.current.handleTextInput('b'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('fires onComplete once with the final stats', () => {
    const { result, onComplete } = setup('ab');
    act(() => result.current.handleTextInput('a'));
    act(() => vi.advanceTimersByTime(30000));
    act(() => result.current.handleTextInput('b'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const stats = onComplete.mock.calls[0][0];
    expect(stats).toMatchObject({ totalCharacters: 2, correctChars: 2, accuracy: 100, duration: 30, cpm: 4 });
    expect(stats.trace).toEqual([0, 30000]);
  });

  describe('IME provisional start', () => {
    it('starts the clock at composition start and keeps it ticking', () => {
      const { result } = setup('你好');
      act(() => result.current.markInputStart());
      expect(result.current.session.startTime).toBe(Date.now());
      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.stats.duration).toBe(2);
    });

    it('rolls back to pristine when the first composition is cancelled', () => {
      const { result } = setup('你好');
      act(() => result.current.markInputStart());
      act(() => vi.advanceTimersByTime(2000));
      act(() => result.current.cancelInputStart());
      expect(result.current.session.startTime).toBeNull();
      expect(result.current.stats.duration).toBe(0);
    });

    it('backdates the first commit to the composition start', () => {
      const { result } = setup('你好');
      act(() => result.current.markInputStart());
      act(() => vi.advanceTimersByTime(1500));
      act(() => result.current.handleTextInput('你好'));
      expect(result.current.session.trace).toEqual([1500, 1500]);
      expect(result.current.stats.duration).toBe(2);
    });

    it('keeps the clock running when a composition is cancelled mid-session', () => {
      const { result } = setup('你好呀');
      act(() => result.current.handleTextInput('你'));
      const startTime = result.current.session.startTime;
      act(() => result.current.markInputStart());
      act(() => result.current.cancelInputStart());
      expect(result.current.session.startTime).toBe(startTime);
    });
  });

  it('resetSession returns to pristine and lets callbacks fire again', () => {
    const { result, onStart, onComplete } = setup('a');
    act(() => result.current.handleTextInput('a'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => result.current.resetSession());
    expect(result.current.session.startTime).toBeNull();
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.session.content[0].status).toBe(CharacterStatus.CURRENT);
    act(() => result.current.handleTextInput('a'));
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
