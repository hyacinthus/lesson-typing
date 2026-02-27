import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useHistoryStore } from '../../stores/historyStore';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import { TypingArea } from '../typing/TypingArea';
import { UserMenu } from '../auth/UserMenu';
import { lessonToCharacters } from '../../utils/lessonLoader';
import type { Lesson, PracticeRecord, RealtimeStats } from '../../types';

interface LessonPracticeProps {
    lesson: Lesson;
    onBack: () => void;
    onNext: () => void;
}

export function LessonPractice({ lesson, onBack, onNext }: LessonPracticeProps) {
    const { t } = useTranslation();
    const addPractice = useHistoryStore((state) => state.addPractice);

    // Initialize characters for the active lesson
    const initialCharacters = useMemo(() => {
        return lessonToCharacters(lesson.content);
    }, [lesson.content]);

    // Handle practice completion
    const handleComplete = useCallback((stats: RealtimeStats) => {
        const record: PracticeRecord = {
            id: `${lesson.id}-${Date.now()}`,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
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
    }, [lesson, addPractice]);

    // Typing engine hook
    const {
        session,
        stats,
        handleCharacterInput,
        handleDelete,
        resetSession,
        isCompleted,
    } = useTypingEngine({
        initialContent: initialCharacters,
        lessonId: lesson.id,
        onComplete: handleComplete,
    });

    return (
        <div className="flex flex-col h-full">
            {/* Header for Practice View */}
            <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between z-10 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        {t('back_home')}
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">{lesson.title}</h2>
                </div>
                <UserMenu />
            </div>

            <div className="flex-1 w-full max-w-4xl mx-auto px-4">
                <TypingArea
                    characters={session.content}
                    stats={stats}
                    currentIndex={session.currentIndex}
                    onCharacterInput={handleCharacterInput}
                    onDelete={handleDelete}
                    onRestart={resetSession}
                    onNextLesson={onNext}
                    isCompleted={isCompleted}
                    disabled={isCompleted}
                />
            </div>
        </div>
    );
}
