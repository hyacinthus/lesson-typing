import { useState, useCallback, useRef, useEffect } from 'react';

const typingFocusIgnoreSelector = '[data-typing-focus-ignore="true"]';

export function shouldMaintainTypingFocus(target: EventTarget | null): boolean {
  if (!target) {
    return true;
  }
  const element = target as Element;

  // 检查是否在忽略列表中
  if (element.closest && element.closest(typingFocusIgnoreSelector)) {
    return false;
  }

  // 检查是否是交互式输入元素（除了 button 和 a，因为我们希望点击按钮时不失焦）
  // 但是，如果点击的是 button/a，默认行为通常是获焦。如果我们阻止默认行为，click 可能受影响。
  // 策略调整：只有当点击的是“非交互区域”时，我们才强制阻止默认行为。
  // 如果点击的是按钮，我们允许它获焦（如果不阻止），或者我们阻止它获焦但允许点击？
  // 用户需求：除了 Back to Home，其他地方点击不影响输入位置。
  // 这意味着点击 Restart 按钮，输入框应该保持聚焦？或者至少 Restart 后能继续打字。
  // 如果我们对 button 阻止默认行为（mousedown），focus 不会转移，但 click 会触发。这是理想的。
  // 例外：input/textarea/select 需要获焦才能工作。

  if (element.closest && element.closest('input, textarea, select, [contenteditable]')) {
    return false;
  }

  // 检查是否在 Dialog/Modal 中
  // Radix UI Dialog Content 通常有 role="dialog"
  if (element.closest && element.closest('[role="dialog"], [role="alertdialog"]')) {
    return false;
  }

  // 检查是否在 Dropdown 中
  if (element.closest && element.closest('[role="menu"], [data-radix-popper-content-wrapper]')) {
    return false;
  }

  return true;
}

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
  onTextInput: (text: string) => void,
  onDelete?: () => void,
  enabled: boolean = true
): CompositionInputHandlers {
  const [isComposing, setIsComposing] = useState(false);
  const [compositionText, setCompositionText] = useState('');
  const lastValueRef = useRef('');
  const lastCompositionEndAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHandlingKeyRef = useRef(false); // 标记是否正在处理按键

  // 保持输入框聚焦
  useEffect(() => {
    if (enabled && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (!shouldMaintainTypingFocus(event.target)) {
        return;
      }

      // 阻止默认行为（如失去焦点）
      event.preventDefault();

      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
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
    lastCompositionEndAtRef.current = performance.now();
    const finalInput = e.currentTarget.value;

    // Pass the committed text as one unit so the typing engine can handle
    // IME auto-paired punctuation against the expected text.
    if (finalInput && enabled) {
      onTextInput(finalInput);
    }

    setCompositionText('');
    if (e.currentTarget.value) {
      e.currentTarget.value = '';
    }
    lastValueRef.current = '';
  }, [onTextInput, enabled]);

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
      onTextInput(inputValue);

      e.target.value = '';
      lastValueRef.current = e.target.value;
    } else {
      lastValueRef.current = inputValue;
    }
  }, [isComposing, onTextInput, onDelete, enabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Keys consumed by the IME must not be treated as typing input. Safari
    // fires compositionend BEFORE the committing key's keydown, so the React
    // isComposing state can already be false by then; the native event
    // usually still marks IME-consumed keys (isComposing / keyCode 229), and
    // the timestamp guard covers the same-keypress pair even when it doesn't
    // (a human cannot press another key within 30ms of the commit).
    if (
      isComposing ||
      e.nativeEvent.isComposing ||
      e.nativeEvent.keyCode === 229 ||
      performance.now() - lastCompositionEndAtRef.current < 30
    ) {
      return;
    }
    if (e.key === 'Backspace' && enabled) {
      if (onDelete) {
        e.currentTarget.value = '';
        lastValueRef.current = '';
        onDelete();
      }
      e.preventDefault();
    } else if (e.key === 'Enter' && enabled) {
      onTextInput('\n');
      e.preventDefault();
    }
  }, [isComposing, onDelete, enabled, onTextInput]);

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
