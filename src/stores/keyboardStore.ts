import { create } from 'zustand';
import { safeStorage } from '@/lib/storage';

/** How the practice shows the keys pressed: a large keyboard over the
 *  bottom half that shows only the keys pressed, a small one in the corner,
 *  or none. */
export type KeyboardMode = 'corner' | 'large' | 'off';

// The first is the default
const KEYBOARD_MODES: readonly KeyboardMode[] = ['large', 'corner', 'off'];

const MODE_STORAGE_KEY = 'lesson-typing-keyboard';

function storedMode(): KeyboardMode {
  const mode = safeStorage.get(MODE_STORAGE_KEY);
  return KEYBOARD_MODES.find((m) => m === mode) ?? KEYBOARD_MODES[0];
}

interface KeyboardState {
  mode: KeyboardMode;
  /** Switches to the next mode, in the order of KEYBOARD_MODES. */
  cycle: () => void;
}

export const useKeyboardStore = create<KeyboardState>((set) => ({
  mode: storedMode(),
  cycle: () =>
    set((state) => {
      const mode = KEYBOARD_MODES[(KEYBOARD_MODES.indexOf(state.mode) + 1) % KEYBOARD_MODES.length];
      safeStorage.set(MODE_STORAGE_KEY, mode);
      return { mode };
    }),
}));
