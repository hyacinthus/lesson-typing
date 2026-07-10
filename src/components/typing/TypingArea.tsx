import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character, RealtimeStats, PracticeRecord } from '../../types';
import { CharacterRenderer } from './CharacterRenderer';
import { ConfettiBurst } from './ConfettiBurst';
import { InputHandler } from './InputHandler';
import { StatsPanel } from './StatsPanel';
import { Leaderboard } from './Leaderboard';
import { RecentActivityChart } from './RecentActivityChart';
import { useAuthStore } from '../../stores/authStore';
import { formatTime, getScoreLevel } from '../../utils/statsCalculator';
import { Button } from '@/components/ui/button';

interface TypingAreaProps {
  characters: Character[];
  stats: RealtimeStats;
  currentIndex: number;
  onCharacterInput: (char: string) => void;
  onDelete: () => void;
  onRestart: () => void;
  onNextLesson?: () => void;
  isCompleted: boolean;
  disabled?: boolean;
  bestRecord?: PracticeRecord | null;
  lessonId: string;
}

export function TypingArea({
  characters,
  stats,
  currentIndex,
  onCharacterInput,
  onDelete,
  onRestart,
  onNextLesson,
  isCompleted,
  disabled = false,
  bestRecord = null,
  lessonId,
}: TypingAreaProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const score = getScoreLevel(stats.accuracy, stats.cpm);
  const inputId = 'typing-input-area';
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number; height: number } | null>(null);

  // Keyboard shortcuts on result screen
  useEffect(() => {
    if (!isCompleted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onNextLesson) {
        e.preventDefault();
        onNextLesson();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, onNextLesson, onRestart]);

  // 更新输入框位置以跟随光标
  useEffect(() => {
    const updatePosition = () => {
      const activeChar = document.querySelector(`span[data-index="${currentIndex}"]`);
      if (activeChar) {
        const rect = activeChar.getBoundingClientRect();
        setCursorPosition({
          top: rect.top,
          left: rect.left,
          height: rect.height,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentIndex]);

  // 自动滚动：当光标位于屏幕下半部分时，自动向上滚动一行
  useEffect(() => {
    const activeChar = document.querySelector(`span[data-index="${currentIndex}"]`);
    if (activeChar) {
      const rect = activeChar.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // 检查光标是否低于屏幕中间
      if (rect.top > viewportHeight / 2) {
        // 获取父元素的行高以进行更精确的滚动
        let scrollAmount = rect.height;
        const parent = activeChar.parentElement;
        if (parent) {
          const lineHeight = parseFloat(window.getComputedStyle(parent).lineHeight);
          if (!isNaN(lineHeight)) {
            scrollAmount = lineHeight;
          }
        }

        window.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex]);

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* 统计面板 */}
      <StatsPanel stats={stats} />

      {/* 打字主区域 */}
      <label
        htmlFor={inputId}
        className="block bg-card rounded-lg shadow-sm border border-border mb-4 md:mb-6 min-h-[200px] md:min-h-[300px] cursor-text overflow-hidden"
      >
        {/* 顶部进度条 */}
        <div className="h-1 w-full bg-muted" role="progressbar" aria-valuenow={stats.progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
        <div className="p-4 md:p-8 text-lg md:text-2xl leading-relaxed md:leading-loose tracking-wide whitespace-pre-wrap break-words">
          {characters.map((char, index) => (
            <CharacterRenderer
              key={char.index}
              character={char}
              isActive={index === currentIndex && !isCompleted}
            />
          ))}
        </div>
      </label>

      {/* 自定义光标 */}
      {cursorPosition && !isCompleted && !disabled && (
        <div
          className="fixed w-[2px] bg-primary z-10 pointer-events-none animate-blink"
          style={{
            top: cursorPosition.top,
            left: cursorPosition.left,
            height: cursorPosition.height,
            transition: 'left 0.1s ease-out, top 0.1s ease-out'
          }}
        />
      )}

      {/* 输入处理器 */}
      {!isCompleted && (
        <InputHandler
          inputId={inputId}
          onCharacterInput={onCharacterInput}
          onDelete={onDelete}
          disabled={disabled}
          cursorPosition={cursorPosition}
        />
      )}

      {/* 完成提示 */}
      {isCompleted && (
        <div
          className="rounded-lg shadow-sm border border-border p-4 md:p-8 text-center bg-results text-results-foreground animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <ConfettiBurst />
          <div
            className={`mx-auto mb-3 md:mb-4 flex size-16 md:size-20 items-center justify-center rounded-full border-4 border-current bg-card/60 text-3xl md:text-4xl font-black ${score.color}`}
          >
            {score.level}
          </div>
          <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4">
            {t('results')}
            {user && (!bestRecord || (stats.accuracy > bestRecord.accuracy || (stats.accuracy === bestRecord.accuracy && stats.cpm > bestRecord.cpm))) && (
              <span className="text-primary ml-2 animate-pulse text-base md:text-3xl">({t('new_record')})</span>
            )}
          </h2>

          {/* Mobile: compact inline results */}
          <div className="flex md:hidden items-center justify-between bg-card/60 rounded-lg px-3 py-2.5 mb-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">WPM</div>
              <div className="font-bold text-primary tabular-nums">{stats.wpm}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">CPM</div>
              <div className="font-bold text-primary tabular-nums">{stats.cpm}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('stats.accuracy')}</div>
              <div className={`font-bold tabular-nums ${score.color}`}>{stats.accuracy}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('time')}</div>
              <div className="font-bold tabular-nums">
                {formatTime(stats.duration)}
              </div>
            </div>
          </div>

          {/* Desktop: original grid */}
          <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-muted-foreground">{t('stats.wpm_title')}</div>
              <div className="text-2xl font-bold text-primary tabular-nums">
                {stats.wpm} {t('stats.wpm_unit')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('stats.char_speed')}</div>
              <div className="text-2xl font-bold text-primary tabular-nums">
                {stats.cpm} {t('stats.char_unit')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('stats.accuracy')}</div>
              <div className={`text-2xl font-bold tabular-nums ${score.color}`}>
                {stats.accuracy}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('time')}</div>
              <div className="text-2xl font-bold tabular-nums">
                {formatTime(stats.duration)}
              </div>
            </div>
          </div>

          {bestRecord && (
            <div className="bg-card/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-border">
              <h3 className="text-xs md:text-sm font-bold mb-2 md:mb-3">{t('personal_best')}</h3>

              {/* Mobile: compact inline best record */}
              <div className="flex md:hidden items-center justify-between text-sm">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">WPM</div>
                  <div className="font-semibold tabular-nums">{bestRecord.wpm}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">CPM</div>
                  <div className="font-semibold tabular-nums">{bestRecord.cpm}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t('stats.accuracy')}</div>
                  <div className="font-semibold tabular-nums">{bestRecord.accuracy}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t('time')}</div>
                  <div className="font-semibold tabular-nums">
                    {formatTime(bestRecord.duration)}
                  </div>
                </div>
              </div>

              {/* Desktop: original grid */}
              <div className="hidden md:grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t('stats.wpm_title')}</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {bestRecord.wpm} {t('stats.wpm_unit')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('stats.char_speed')}</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {bestRecord.cpm} {t('stats.char_unit')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('stats.accuracy')}</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {bestRecord.accuracy}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('time')}</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatTime(bestRecord.duration)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground mb-4 md:mb-6 text-center">{t('auth.login_prompt')}</p>
          )}

          <div className="flex gap-3 md:gap-4 justify-center">
            {!user && (
              <Button
                onClick={() => setLoginDialogOpen(true)}
                className="h-auto font-bold py-2.5 md:py-3 px-6 md:px-8 shadow-sm hover:shadow-md text-sm md:text-base"
              >
                {t('auth.login')}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={onRestart}
              className="h-auto font-bold py-2.5 md:py-3 px-6 md:px-8 shadow-sm hover:shadow-md text-sm md:text-base"
            >
              {t('restart')} <kbd className="ml-1 text-xs opacity-60 font-normal">R</kbd>
            </Button>
            {onNextLesson && (
              <Button
                onClick={onNextLesson}
                className="h-auto font-bold py-2.5 md:py-3 px-6 md:px-8 shadow-sm hover:shadow-md text-sm md:text-base"
              >
                {t('next_lesson')} <kbd className="ml-1 text-xs opacity-60 font-normal">↵</kbd>
              </Button>
            )}
          </div>
          <RecentActivityChart lessonId={lessonId} currentStats={stats} />
          <Leaderboard lessonId={lessonId} currentStats={stats} />
        </div>
      )}

      {/* Leaderboard before completion */}
      {!isCompleted && (
        <Leaderboard lessonId={lessonId} />
      )}
    </div>
  );
}
