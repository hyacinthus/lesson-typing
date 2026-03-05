import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character, RealtimeStats, PracticeRecord } from '../../types';
import { CharacterRenderer } from './CharacterRenderer';
import { InputHandler } from './InputHandler';
import { StatsPanel } from './StatsPanel';
import { RecentActivityChart } from './RecentActivityChart';
import { useAuthStore } from '../../stores/authStore';

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
  const inputId = 'typing-input-area';
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number; height: number } | null>(null);

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
        className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-8 mb-4 md:mb-6 min-h-[200px] md:min-h-[300px] cursor-text"
      >
        <div className="text-lg md:text-2xl leading-relaxed md:leading-loose tracking-wide whitespace-pre-wrap break-words">
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
          className="fixed w-[2px] bg-primary z-10 pointer-events-none animate-[blink_1s_infinite]"
          style={{
            top: cursorPosition.top,
            left: cursorPosition.left,
            height: cursorPosition.height,
            transition: 'left 0.1s ease-out, top 0.1s ease-out'
          }}
        />
      )}

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-end text-sm text-gray-600 mb-2">
          <span>{stats.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

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
          className="rounded-lg shadow-sm border border-gray-200 p-4 md:p-8 text-center bg-[#E9F4FF]"
        >
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
            {t('results')}
            {user && (!bestRecord || (stats.accuracy > bestRecord.accuracy || (stats.accuracy === bestRecord.accuracy && stats.cpm > bestRecord.cpm))) && (
              <span className="text-primary ml-2 animate-pulse text-base md:text-3xl">({t('new_record')})</span>
            )}
          </h2>

          {/* Mobile: compact inline results */}
          <div className="flex md:hidden items-center justify-between bg-white/60 rounded-lg px-3 py-2.5 mb-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-gray-500">WPM</div>
              <div className="font-bold text-green-600">{stats.wpm}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">CPM</div>
              <div className="font-bold text-primary">{stats.cpm}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{t('stats.accuracy')}</div>
              <div className="font-bold text-purple-600">{stats.accuracy}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{t('time')}</div>
              <div className="font-bold text-gray-900">
                {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Desktop: original grid */}
          <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">{t('stats.wpm_title')}</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.wpm} {t('stats.wpm_unit')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t('stats.char_speed')}</div>
              <div className="text-2xl font-bold text-primary">
                {stats.cpm} {t('stats.char_unit')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t('stats.accuracy')}</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.accuracy}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t('time')}</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {bestRecord && (
            <div className="bg-white/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-gray-200">
              <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">{t('personal_best')}</h3>

              {/* Mobile: compact inline best record */}
              <div className="flex md:hidden items-center justify-between text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-400">WPM</div>
                  <div className="font-semibold text-gray-700">{bestRecord.wpm}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">CPM</div>
                  <div className="font-semibold text-gray-700">{bestRecord.cpm}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">{t('stats.accuracy')}</div>
                  <div className="font-semibold text-gray-700">{bestRecord.accuracy}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">{t('time')}</div>
                  <div className="font-semibold text-gray-700">
                    {Math.floor(bestRecord.duration / 60)}:{(bestRecord.duration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* Desktop: original grid */}
              <div className="hidden md:grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">{t('stats.wpm_title')}</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {bestRecord.wpm} {t('stats.wpm_unit')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('stats.char_speed')}</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {bestRecord.cpm} {t('stats.char_unit')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('stats.accuracy')}</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {bestRecord.accuracy}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('time')}</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {Math.floor(bestRecord.duration / 60)}:{(bestRecord.duration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!user && (
            <p className="text-sm text-gray-500 mb-4 md:mb-6 text-center">{t('auth.login_prompt')}</p>
          )}

          <div className="flex gap-3 md:gap-4 justify-center">
            {!user && (
              <button
                onClick={() => setLoginDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg shadow-sm hover:shadow-md transition-all text-sm md:text-base"
              >
                {t('auth.login')}
              </button>
            )}
            <button
              onClick={onRestart}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg shadow-sm hover:shadow-md transition-all text-sm md:text-base"
            >
              {t('restart')}
            </button>
            {onNextLesson && (
              <button
                onClick={onNextLesson}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg shadow-sm hover:shadow-md transition-all text-sm md:text-base"
              >
                {t('next_lesson')}
              </button>
            )}
          </div>
          <RecentActivityChart lessonId={lessonId} currentStats={stats} />
        </div>
      )}
    </div>
  );
}
