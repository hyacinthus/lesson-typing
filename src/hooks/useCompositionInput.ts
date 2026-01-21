import { useState, useCallback, useRef, useEffect } from 'react';

interface CompositionInputHandlers {
  onCompositionStart: () => void;
  onCompositionUpdate: (e: React.CompositionEvent<HTMLInputElement>) => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isComposing: boolean;
  compositionText: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useCompositionInput(
  onCharacterInput: (char: string) => void,
  onDelete?: () => void,
  enabled: boolean = true
): CompositionInputHandlers {
  const [isComposing, setIsComposing] = useState(false);
  const [compositionText, setCompositionText] = useState('');
  const lastValueRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isHandlingKeyRef = useRef(false); // 标记是否正在处理按键

  // 保持输入框聚焦
  useEffect(() => {
    if (enabled && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    setCompositionText('');
  }, []);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setCompositionText(e.data);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    const finalInput = e.currentTarget.value;

    if (finalInput && enabled) {
      const chars = Array.from(finalInput);
      chars.forEach(char => onCharacterInput(char));
    }

    setCompositionText('');
    if (e.currentTarget.value) {
      e.currentTarget.value = '';
    }
    lastValueRef.current = '';
  }, [onCharacterInput, enabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isComposing || isHandlingKeyRef.current) {
      isHandlingKeyRef.current = false;
      return;
    }

    const inputValue = e.target.value;
    const lastValue = lastValueRef.current;

    if (inputValue.length < lastValue.length && onDelete) {
      onDelete();
      lastValueRef.current = inputValue;
    } else if (inputValue.length > 0 && enabled) {
      const chars = Array.from(inputValue);
      chars.forEach(char => onCharacterInput(char));

      e.target.value = '';
      lastValueRef.current = e.target.value;
    } else {
      lastValueRef.current = inputValue;
    }
  }, [isComposing, onCharacterInput, onDelete, enabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !isComposing && enabled) {
      if (onDelete) {
        e.currentTarget.value = '';
        lastValueRef.current = '';
        onDelete();
      }
      e.preventDefault();
    } else if (e.key === 'Enter' && !isComposing && enabled) {
      onCharacterInput('\n');
      e.preventDefault();
    }
  }, [isComposing, onDelete, enabled, onCharacterInput]);

  return {
    onCompositionStart: handleCompositionStart,
    onCompositionUpdate: handleCompositionUpdate,
    onCompositionEnd: handleCompositionEnd,
    onInputChange: handleInputChange,
    onKeyDown: handleKeyDown,
    isComposing,
    compositionText,
    inputRef,
  };
}
