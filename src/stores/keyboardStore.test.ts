import { describe, expect, it } from 'vitest';
import { useKeyboardStore } from './keyboardStore';

describe('the keyboard mode', () => {
  it('starts with the large keyboard and cycles through the corner and none', () => {
    expect(useKeyboardStore.getState().mode).toBe('large');
    const { cycle } = useKeyboardStore.getState();
    const modes = [useKeyboardStore.getState().mode];
    for (let i = 0; i < 3; i++) {
      cycle();
      modes.push(useKeyboardStore.getState().mode);
    }
    expect(modes).toEqual(['large', 'corner', 'off', 'large']);
  });
});
