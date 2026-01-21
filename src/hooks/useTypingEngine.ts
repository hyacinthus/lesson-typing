import { useState, useCallback, useRef, useEffect } from 'react';
import type { Character, TypingSession, RealtimeStats } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';
import { calculateStats } from '../utils/statsCalculator';

export interface UseTypingEngineProps {
  initialContent: Character[];
  lessonId: string;
  onComplete?: (stats: RealtimeStats) => void;
}

export function useTypingEngine({
  initialContent,
  lessonId,
  onComplete,
}: UseTypingEngineProps) {
  const [session, setSession] = useState<TypingSession>(() => ({
    lessonId,
    content: initialContent,
    currentIndex: 0,
    startTime: null,
    elapsedTime: 0,
    isPaused: false,
    isCompleted: false,
    compositionText: '',
  }));

  const [stats, setStats] = useState<RealtimeStats>({
    duration: 0,
    characterSpeed: 0,
    chineseSpeed: 0,
    accuracy: 100,
    totalCharacters: 0,
    correctChars: 0,
    incorrectChars: 0,
    progress: 0,
  });

  // 当 initialContent 改变时重置会话
  // Note: We rely on the component using this hook to remount when initialContent/lessonId changes (using key).
  // This avoids setting state in useEffect which causes double renders.

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // 开始计时
  const startTimer = useCallback(() => {
    if (session.startTime === null) {
      const now = Date.now();
      setSession(prev => ({ ...prev, startTime: now }));
      startTimeRef.current = now;

      // 启动计时器
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setSession(prev => ({ ...prev, elapsedTime: elapsed }));
        }
      }, 100); // 每 100ms 更新一次
    }
  }, [session.startTime]);

  // 停止计时
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 处理字符输入
  const handleCharacterInput = useCallback((inputChar: string) => {
    setSession(prev => {
      // 第一次输入时开始计时
      if (prev.startTime === null) {
        startTimer();
      }

      const newContent = [...prev.content];
      const currentIndex = prev.currentIndex;

      // 检查是否已完成
      if (currentIndex >= newContent.length) {
        return prev;
      }

      const currentChar = newContent[currentIndex];

      // 检查输入是否正确
      const isCorrect = inputChar === currentChar.char;

      // 更新字符状态
      newContent[currentIndex] = {
        ...currentChar,
        status: isCorrect ? CharacterStatus.CORRECT : CharacterStatus.INCORRECT,
        input: inputChar,
      };

      // 移动到下一个字符
      const nextIndex = currentIndex + 1;
      const isCompleted = nextIndex >= newContent.length;

      if (nextIndex < newContent.length) {
        newContent[nextIndex] = {
          ...newContent[nextIndex],
          status: CharacterStatus.CURRENT,
        };
      }

      const newSession = {
        ...prev,
        content: newContent,
        currentIndex: nextIndex,
        isCompleted,
      };

      // 计算实时统计
      const newStats = calculateStats(newSession);
      setStats(newStats);

      // 如果完成，停止计时并触发回调
      if (isCompleted) {
        stopTimer();
        if (onComplete) {
          onComplete(newStats);
        }
      }

      return newSession;
    });
  }, [startTimer, stopTimer, onComplete]);

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

      const newSession = {
        ...prev,
        content: newContent,
        currentIndex: prevIndex,
      };

      // 重新计算统计
      const newStats = calculateStats(newSession);
      setStats(newStats);

      return newSession;
    });
  }, []);

  // 重置会话
  const resetSession = useCallback(() => {
    stopTimer();
    startTimeRef.current = null;
    setSession({
      lessonId,
      content: initialContent.map((char, index) => ({
        ...char,
        status: index === 0 ? CharacterStatus.CURRENT : CharacterStatus.PENDING,
        input: '',
      })),
      currentIndex: 0,
      startTime: null,
      elapsedTime: 0,
      isPaused: false,
      isCompleted: false,
      compositionText: '',
    });
    setStats({
      duration: 0,
      characterSpeed: 0,
      chineseSpeed: 0,
      accuracy: 100,
      totalCharacters: 0,
      correctChars: 0,
      incorrectChars: 0,
      progress: 0,
    });
  }, [initialContent, lessonId, stopTimer]);

  // 清理定时器
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  return {
    session,
    stats,
    handleCharacterInput,
    handleDelete,
    resetSession,
    isCompleted: session.isCompleted,
  };
}
