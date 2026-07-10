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
      return 'text-char-pending';
    case CharacterStatus.CURRENT:
      return 'bg-char-current-bg text-char-current rounded-[3px]';
    case CharacterStatus.CORRECT:
      return 'text-char-correct';
    case CharacterStatus.INCORRECT:
      return 'text-char-incorrect bg-char-incorrect-bg underline decoration-char-incorrect decoration-wavy';
    default:
      return '';
  }
}
