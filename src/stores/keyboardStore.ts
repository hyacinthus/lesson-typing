import { create } from 'zustand';
import { safeStorage } from '@/lib/storage';

const SHOWN_STORAGE_KEY = 'lesson-typing-keyboard-shown';

interface KeyboardState {
  /** Whether the practice shows the keyboard in the corner. */
  shown: boolean;
  toggle: () => void;
}

export const useKeyboardStore = create<KeyboardState>((set) => ({
  shown: safeStorage.get(SHOWN_STORAGE_KEY) !== 'false',
  toggle: () =>
    set((state) => {
      safeStorage.set(SHOWN_STORAGE_KEY, String(!state.shown));
      return { shown: !state.shown };
    }),
}));
