import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Character, TypingSession, RealtimeStats } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';
import { calculateStats } from '../utils/statsCalculator';
import { charMatches, resolveInputChars } from '../utils/punctuationMatch';

export interface UseTypingEngineProps {
  initialContent: Character[];
  lessonId: string;
  onStart?: () => void;
  onComplete?: (stats: RealtimeStats) => void;
}

const INITIAL_STATS: RealtimeStats = Object.freeze({
  duration: 0,
  cpm: 0,
  wpm: 0,
  accuracy: 100,
  totalCharacters: 0,
  correctChars: 0,
  incorrectChars: 0,
  effectiveKeystrokes: 0,
  progress: 0,
  trace: [],
});

function createSession(lessonId: string, content: Character[]): TypingSession {
  return {
    lessonId,
    content: content.map((char, index) => ({
      ...char,
      status: index === 0 ? CharacterStatus.CURRENT : CharacterStatus.PENDING,
      input: '',
    })),
    currentIndex: 0,
    startTime: null,
    elapsedTime: 0,
    isCompleted: false,
    trace: [],
  };
}

export function useTypingEngine({
  initialContent,
  lessonId,
  onStart,
  onComplete,
}: UseTypingEngineProps) {
  const [session, setSession] = useState<TypingSession>(() => createSession(lessonId, initialContent));

  // Duration shown while the user pauses between keystrokes; updated by the
  // interval effect below. Everything else in stats derives from `session`.
  const [liveDurationSec, setLiveDurationSec] = useState(0);

  // 当 initialContent 改变时重置会话
  // Note: We rely on the component using this hook to remount when initialContent/lessonId changes (using key).
  // This avoids setting state in useEffect which causes double renders.

  // onStart/onComplete must fire exactly once per run, even if the callback
  // identities change between renders.
  const startNotifiedRef = useRef(false);
  const completeNotifiedRef = useRef(false);

  // 处理输入：一次按键的单个字符，或一次 IME 上屏的整段文本
  // The updater must stay pure: React evaluates updaters eagerly and may
  // replay them, so side effects here run at unpredictable times (this
  // previously leaked intervals, delayed the timing start and dropped the
  // first trace entries). Timing starts at the first keystroke by setting
  // startTime inside the returned session itself (for IME input the clock is
  // usually already running: markInputStart starts it at compositionstart).
  const handleTextInput = useCallback((text: string) => {
    setSession(prev => {
      const currentIndex = prev.currentIndex;

      // 检查是否已完成
      if (prev.isCompleted || currentIndex >= prev.content.length || text.length === 0) {
        return prev;
      }

      const now = Date.now();
      const startTime = prev.startTime ?? now;

      const newContent = [...prev.content];

      // IME auto-pairing may commit both halves of a quote/bracket pair at
      // once; keep only the half that belongs at the cursor.
      const chars = Array.from(text);
      const expectedNext = newContent
        .slice(currentIndex, currentIndex + chars.length)
        .map(c => c.char);
      const inputChars = resolveInputChars(chars, expectedNext);

      let nextIndex = currentIndex;
      const trace = [...prev.trace];
      for (const inputChar of inputChars) {
        if (nextIndex >= newContent.length) {
          break;
        }
        const target = newContent[nextIndex];
        newContent[nextIndex] = {
          ...target,
          status: charMatches(inputChar, target.char)
            ? CharacterStatus.CORRECT
            : CharacterStatus.INCORRECT,
          input: inputChar,
        };
        nextIndex++;
        trace.push(now - startTime);
      }

      const isCompleted = nextIndex >= newContent.length;

      if (!isCompleted) {
        newContent[nextIndex] = {
          ...newContent[nextIndex],
          status: CharacterStatus.CURRENT,
        };
      }

      return {
        ...prev,
        content: newContent,
        currentIndex: nextIndex,
        isCompleted,
        startTime,
        elapsedTime: now - startTime,
        trace,
      };
    });
  }, []);

  // The visible clock must tick while the first phrase is still being
  // composed, so markInputStart provisionally starts the session at the first
  // composition keystroke; cancelInputStart rolls that back when a composition
  // is cancelled before any text was ever committed, restoring the pristine
  // not-started state (clock at 0, article switching available).
  const markInputStart = useCallback(() => {
    setSession(prev => {
      if (prev.startTime !== null) {
        return prev;
      }
      return { ...prev, startTime: Date.now() };
    });
  }, []);

  const cancelInputStart = useCallback(() => {
    // startNotifiedRef flips on the first committed character, so it doubles
    // as "the session is past the provisional stage" — mid-session cancels
    // (and deletes back to 0) keep the clock running.
    if (startNotifiedRef.current) {
      return;
    }
    setLiveDurationSec(0);
    setSession(prev => {
      // Updaters must stay pure and may be replayed (see handleTextInput), so
      // revalidate against session state instead of trusting the ref above.
      // trace only grows on commits, so an empty trace means nothing was ever
      // committed (unlike currentIndex, it survives deleting back to 0).
      if (prev.startTime === null || prev.trace.length > 0) {
        return prev;
      }
      return { ...prev, startTime: null, elapsedTime: 0 };
    });
  }, []);

  // 处理删除
  const handleDelete = useCallback(() => {
    setSession(prev => {
      if (prev.currentIndex === 0 || prev.isCompleted) {
        return prev;
      }

      const newContent = [...prev.content];
      const currentIndex = prev.currentIndex;
      const prevIndex = currentIndex - 1;

      // 重置前一个字符状态
      newContent[prevIndex] = {
        ...newContent[prevIndex],
        status: CharacterStatus.CURRENT,
        input: '',
      };

      // 重置当前字符状态
      if (currentIndex < newContent.length) {
        newContent[currentIndex] = {
          ...newContent[currentIndex],
          status: CharacterStatus.PENDING,
        };
      }

      return {
        ...prev,
        content: newContent,
        currentIndex: prevIndex,
        elapsedTime: prev.startTime !== null ? Date.now() - prev.startTime : 0,
      };
    });
  }, []);

  // 计算实时统计
  // Derived from session (which only changes on keystroke/delete/reset), so
  // the expensive calculation never runs on a plain clock tick.
  const baseStats = useMemo<RealtimeStats>(() => {
    if (session.startTime === null) {
      return INITIAL_STATS;
    }
    return { ...calculateStats(session), trace: session.trace };
  }, [session]);

  // Clock ticks only patch the displayed duration on top of baseStats.
  const stats = useMemo<RealtimeStats>(() => {
    if (session.startTime === null || session.isCompleted) {
      return baseStats;
    }
    return { ...baseStats, duration: Math.max(baseStats.duration, liveDurationSec) };
  }, [baseStats, liveDurationSec, session.startTime, session.isCompleted]);

  // Keep the displayed duration ticking between keystrokes. Creating the
  // interval in an effect keyed on startTime guarantees exactly one interval
  // per run and cleanup on completion/reset/unmount.
  useEffect(() => {
    const startTime = session.startTime;
    if (startTime === null || session.isCompleted) {
      return;
    }
    const id = setInterval(() => {
      setLiveDurationSec(Math.round((Date.now() - startTime) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [session.startTime, session.isCompleted]);

  // onStart is keyed on the first committed character, not on startTime: a
  // provisional (still-composing, cancellable) start must not create the
  // backend practice session. The boolean keeps the effect from re-running
  // on every subsequent keystroke.
  const hasCommittedInput = session.currentIndex > 0;
  useEffect(() => {
    if (hasCommittedInput && !startNotifiedRef.current) {
      startNotifiedRef.current = true;
      onStart?.();
    }
  }, [hasCommittedInput, onStart]);

  useEffect(() => {
    if (session.isCompleted && !completeNotifiedRef.current) {
      completeNotifiedRef.current = true;
      onComplete?.(stats);
    }
  }, [session.isCompleted, stats, onComplete]);

  // 重置会话
  const resetSession = useCallback(() => {
    startNotifiedRef.current = false;
    completeNotifiedRef.current = false;
    setLiveDurationSec(0);
    setSession(createSession(lessonId, initialContent));
  }, [initialContent, lessonId]);

  return {
    session,
    stats,
    handleTextInput,
    handleDelete,
    markInputStart,
    cancelInputStart,
    resetSession,
    isCompleted: session.isCompleted,
  };
}
