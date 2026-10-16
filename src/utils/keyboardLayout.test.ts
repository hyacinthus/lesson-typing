import { describe, expect, it } from 'vitest';
import { MAC_KEYBOARD, PC_KEYBOARD } from './keyboardLayout';

describe.each([['mac', MAC_KEYBOARD], ['pc', PC_KEYBOARD]])('the %s keyboard', (_, rows) => {
  const codes = rows.flat().map((k) => k.code);

  it('has rows 15 keys wide', () => {
    for (const row of rows) {
      expect(row.reduce((sum, k) => sum + k.width, 0)).toBe(15);
    }
  });

  it('has each key once', () => {
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('names the keys by their KeyboardEvent.code', () => {
    expect(codes).toEqual(expect.arrayContaining(['Backquote', 'Digit1', 'Minus', 'KeyQ', 'BracketLeft', 'Backslash', 'Semicolon', 'Quote', 'Comma', 'Slash', 'Space']));
  });
});
