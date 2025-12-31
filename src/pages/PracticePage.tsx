import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PracticeRecord } from '../types';
import type { RealtimeStats } from '../types';
import { useLessonStore } from '../stores/lessonStore';
import { useHistoryStore } from '../stores/historyStore';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { TypingArea } from '../components/typing/TypingArea';
import { lessonToCharacters } from '../utils/lessonLoader';
import { ArrowLeft, Home } from 'lucide-react';

export function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLesson, loadLesson, isLoading } = useLessonStore();
  const addPractice = useHistoryStore((state) => state.addPractice);

  // 加载课文
  useEffect(() => {
    if (id && (!currentLesson || currentLesson.id !== id)) {
      loadLesson(id);
    }
  }, [id, currentLesson, loadLesson]);

  // 初始化字符数组
  // 使用 useMemo 确保只有当课文内容改变时才重新计算
  const initialCharacters = useMemo(() => {
    if (!currentLesson || currentLesson.id !== id) return [];
    return lessonToCharacters(currentLesson.content);
  }, [currentLesson, id]);

  // 处理练习完成
  const handleComplete = useCallback((stats: RealtimeStats) => {
    if (currentLesson) {
      const record: PracticeRecord = {
        id: `${currentLesson.id}-${Date.now()}`,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        duration: stats.duration,
        characterSpeed: stats.characterSpeed,
        chineseSpeed: stats.chineseSpeed,
        accuracy: stats.accuracy,
        totalCharacters: stats.totalCharacters,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars,
        completedAt: new Date().toISOString(),
      };
      addPractice(record);
    }
  }, [currentLesson, addPractice]);

  // 打字引擎
  const {
    session,
    stats,
    handleCharacterInput,
    handleDelete,
    resetSession,
    isCompleted,
  } = useTypingEngine({
    initialContent: initialCharacters,
    lessonId: id || '',
    onComplete: handleComplete,
  });

  if (isLoading || !currentLesson || currentLesson.id !== id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            返回
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h1>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Home size={20} />
              首页
            </button>
          </div>
        </div>
      </div>

      <TypingArea
        characters={session.content}
        stats={stats}
        currentIndex={session.currentIndex}
        onCharacterInput={handleCharacterInput}
        onDelete={handleDelete}
        onRestart={resetSession}
        isCompleted={isCompleted}
        disabled={isCompleted}
      />
    </div>
  );
}
