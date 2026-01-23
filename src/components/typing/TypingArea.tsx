import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character, RealtimeStats } from '../../types';
import { CharacterRenderer } from './CharacterRenderer';
import { InputHandler } from './InputHandler';
import { StatsPanel } from './StatsPanel';

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
}: TypingAreaProps) {
  const { t } = useTranslation();
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
        className="block bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 min-h-[300px] cursor-text"
      >
        <div className="text-2xl leading-loose tracking-wide whitespace-pre-wrap break-words">
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
          className="fixed w-[2px] bg-blue-600 z-10 pointer-events-none animate-[blink_1s_infinite]"
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
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>进度</span>
          <span>{stats.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('results')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">{t('stats.wpm_title')}</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.chineseSpeed} {t('stats.wpm_unit')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t('stats.char_speed')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.characterSpeed} {t('stats.char_unit')}
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
          <div className="flex gap-4 justify-center">
            <button
              onClick={onRestart}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg transition-colors"
            >
              {t('restart')}
            </button>
            {onNextLesson && (
              <button
                onClick={onNextLesson}
                className="bg-[#90caf9] hover:bg-[#64b5f6] text-white font-medium py-3 px-8 rounded-full shadow-sm hover:shadow-md transition-all"
              >
                {t('next_lesson')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
