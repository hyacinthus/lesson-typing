import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useHistoryStore } from '../../stores/historyStore';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import { TypingArea } from '../typing/TypingArea';
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
            <div className="bg-header text-header-foreground shadow-sm px-6 py-4 flex items-center justify-center relative z-10 mb-8">
                <button
                    onClick={onBack}
                    data-typing-focus-ignore="true"
                    className="absolute left-6 flex items-center gap-2 text-header-foreground/80 hover:text-header-foreground transition-colors"
                >
                    <ArrowLeft size={20} />
                    {t('back_home')}
                </button>
                <h2 className="text-xl font-bold">{lesson.title}</h2>
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
