import { useMemo, memo } from 'react';
import type { Character } from '../../types/typing.types';
import { CharacterStatus } from '../../types/typing.types';

interface CharacterRendererProps {
  character: Character;
  isActive: boolean;
}

export const CharacterRenderer = memo(function CharacterRenderer({ character, isActive }: CharacterRendererProps) {
  const className = useMemo(() => {
    const statusClass = getStatusClass(character.status);
    const activeClass = isActive ? 'cursor-active' : '';

    return `character ${statusClass} ${activeClass}`.trim();
  }, [character.status, isActive]);

  // 处理空格显示
  // 使用普通空格代替 \u00A0 以允许自然换行
  const displayChar = character.char;
  // 处理换行显示
  const isLineBreak = character.char === '\n';

  if (isLineBreak) {
    return (
      <>
        <span className={className} data-index={character.index}>
          ↵
        </span>
        <br />
      </>
    );
  }

  return (
    <span className={className} data-index={character.index}>
      {displayChar}
    </span>
  );
});

function getStatusClass(status: CharacterStatus): string {
  switch (status) {
    case CharacterStatus.PENDING:
      return 'text-gray-400';
    case CharacterStatus.CURRENT:
      return 'bg-[#e3f2fd] text-[#1976d2]';
    case CharacterStatus.CORRECT:
      return 'text-green-600';
    case CharacterStatus.INCORRECT:
      return 'text-red-600 bg-red-50 underline decoration-red-500 decoration-wavy';
    default:
      return '';
  }
}
