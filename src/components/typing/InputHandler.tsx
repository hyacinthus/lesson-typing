import { useCompositionInput } from '../../hooks/useCompositionInput';

interface InputHandlerProps {
  onCharacterInput: (char: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  compositionText?: string;
  inputId?: string;
  cursorPosition?: { top: number; left: number } | null;
}

export function InputHandler({
  onCharacterInput,
  onDelete,
  disabled = false,
  inputId,
  cursorPosition,
}: Omit<InputHandlerProps, 'compositionText'>) {
  const {
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onInputChange,
    onKeyDown,
    isComposing,
    compositionText,
    inputRef,
  } = useCompositionInput(onCharacterInput, onDelete, !disabled);

  const inputStyle: React.CSSProperties = cursorPosition
    ? {
        position: 'fixed',
        left: `${cursorPosition.left}px`,
        top: `${cursorPosition.top}px`,
        opacity: 0,
        pointerEvents: 'none',
        width: '1px',
        height: '1.5em', // Approximate line height
        zIndex: -1,
      }
    : {
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        opacity: 0,
        zIndex: -10,
      };

  return (
    <>
      {/* 隐藏的输入框 - 使用绝对定位隐藏但保持可聚焦 */}
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        className="opacity-0"
        style={inputStyle}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* 输入法组合文本预览 */}
      {isComposing && compositionText && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg text-lg font-medium">
          {compositionText}
        </div>
      )}
    </>
  );
}
