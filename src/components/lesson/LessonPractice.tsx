import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shuffle } from 'lucide-react';
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
    const startPracticeSession = useHistoryStore((state) => state.startPracticeSession);
    const addPractice = useHistoryStore((state) => state.addPractice);
    const getBestPracticeLog = useHistoryStore((state) => state.getBestPracticeLog);
    const [historyBest, setHistoryBest] = useState<PracticeRecord | null>(null);
    const sessionIdRef = useRef<string | undefined>(undefined);

    // Initialize characters for the active lesson
    const initialCharacters = useMemo(() => {
        return lessonToCharacters(lesson.content);
    }, [lesson.content]);

    // Handle practice completion
    // Use a ref to prevent double submission in Strict Mode
    const processingRef = useRef(false);

    const handleComplete = useCallback((stats: RealtimeStats) => {
        if (processingRef.current) return;
        processingRef.current = true;

        const record: PracticeRecord = {
            id: `${lesson.id}-${Date.now()}`,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            duration: stats.duration,
            cpm: stats.cpm,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            totalCharacters: stats.totalCharacters,
            correctChars: stats.correctChars,
            incorrectChars: stats.incorrectChars,
            effectiveKeystrokes: stats.effectiveKeystrokes,
            completedAt: new Date().toISOString(),
            sessionId: sessionIdRef.current,
            trace: stats.trace,
        };
        addPractice(record, lesson.language, lesson.collectionId);

        // Reset processing flag after a short delay, or when lesson changes
        setTimeout(() => {
            processingRef.current = false;
        }, 1000);
    }, [lesson, addPractice]);

    const handleStart = useCallback(() => {
        // Initialize practice session upon first keystroke
        sessionIdRef.current = undefined;
        startPracticeSession(lesson.id).then((id) => {
            if (id) {
                sessionIdRef.current = id;
            }
        });
    }, [lesson.id, startPracticeSession]);

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
        onStart: handleStart,
        onComplete: handleComplete,
    });

    // Fetch history best when lesson changes or practice resets
    useEffect(() => {
        if (!isCompleted) {
            getBestPracticeLog(lesson.id).then(setHistoryBest);
        }
    }, [lesson.id, isCompleted, getBestPracticeLog]);

    return (
        <div className="flex flex-col h-full">
            {/* Header for Practice View */}
            <div className="bg-header text-header-foreground shadow-sm px-4 md:px-6 py-3 md:py-4 flex items-center justify-center relative z-10 mb-4 md:mb-8">
                <button
                    onClick={onBack}
                    data-typing-focus-ignore="true"
                    className="absolute left-3 md:left-6 flex items-center gap-1 md:gap-2 text-header-foreground/80 hover:text-header-foreground transition-colors"
                >
                    <ArrowLeft size={18} className="md:w-5 md:h-5" />
                    <span className="hidden md:inline">{t('back_home')}</span>
                </button>
                <h2 className="text-base md:text-xl font-bold max-w-[60vw] md:max-w-none truncate">{lesson.title}</h2>
                {session.startTime === null && (
                    <button
                        onClick={onNext}
                        data-typing-focus-ignore="true"
                        className="absolute right-3 md:right-6 flex items-center gap-1 md:gap-2 text-header-foreground/80 hover:text-header-foreground transition-colors"
                    >
                        <Shuffle size={16} className="md:w-[18px] md:h-[18px]" />
                        <span className="hidden md:inline">{t('change_article')}</span>
                    </button>
                )}
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
                    bestRecord={historyBest}
                    lessonId={lesson.id}
                />
            </div>
        </div>
    );
}
