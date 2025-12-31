import { useState, useEffect } from 'react';
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
  isCompleted,
  disabled = false,
}: TypingAreaProps) {
  const inputId = 'typing-input-area';
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);

  // 更新输入框位置以跟随光标
  useEffect(() => {
    const updatePosition = () => {
      const activeChar = document.querySelector(`span[data-index="${currentIndex}"]`);
      if (activeChar) {
        const rect = activeChar.getBoundingClientRect();
        setCursorPosition({
          top: rect.top,
          left: rect.left,
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

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* 统计面板 */}
      <StatsPanel stats={stats} />

      {/* 打字主区域 */}
      <label
        htmlFor={inputId}
        className="block bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 min-h-[300px] cursor-text"
      >
        <div className="text-2xl leading-loose tracking-wide">
          {characters.map((char, index) => (
            <CharacterRenderer
              key={char.index}
              character={char}
              isActive={index === currentIndex && !isCompleted}
            />
          ))}
        </div>
      </label>

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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">练习完成！</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">中文速率</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.chineseSpeed} 字/分钟
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">字符速率</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.characterSpeed} 字符/分钟
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">准确率</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.accuracy}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">用时</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            再练一次
          </button>
        </div>
      )}
    </div>
  );
}
