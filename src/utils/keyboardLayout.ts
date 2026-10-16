/** A key of the practice view's keyboard: its KeyboardEvent.code, its US
 *  label and its width in keys. */
export interface KeyCap {
  code: string;
  label: string;
  width: number;
}

const SIGN_CODES: Record<string, string> = {
  '`': 'Backquote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight',
  ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash',
};

const key = (code: string, label: string, width = 1): KeyCap => ({ code, label, width });

// The keys that type a letter, a digit or a sign, one per character of labels
const typing = (labels: string) =>
  [...labels].map((l) => key(SIGN_CODES[l] ?? (/\d/.test(l) ? `Digit${l}` : `Key${l}`), l));

// The main block of an ANSI keyboard, 15 keys wide; desktop/app/keyboard.go
// has the same rows.
const TOP_ROWS: KeyCap[][] = [
  [...typing('`1234567890-='), key('Backspace', '⌫', 2)],
  [key('Tab', '⇥', 1.5), ...typing('QWERTYUIOP[]'), key('Backslash', '\\', 1.5)],
  [key('CapsLock', '⇪', 1.75), ...typing("ASDFGHJKL;'"), key('Enter', '↵', 2.25)],
  [key('ShiftLeft', '⇧', 2.25), ...typing('ZXCVBNM,./'), key('ShiftRight', '⇧', 2.75)],
];

export const MAC_KEYBOARD: KeyCap[][] = [...TOP_ROWS, [
  key('ControlLeft', '⌃', 1.5), key('AltLeft', '⌥', 1.25), key('MetaLeft', '⌘', 1.5), key('Space', '', 6.5),
  key('MetaRight', '⌘', 1.5), key('AltRight', '⌥', 1.25), key('ControlRight', '⌃', 1.5),
]];

export const PC_KEYBOARD: KeyCap[][] = [...TOP_ROWS, [
  key('ControlLeft', 'Ctrl', 1.25), key('MetaLeft', 'Win', 1.25), key('AltLeft', 'Alt', 1.25), key('Space', '', 6.25),
  key('AltRight', 'Alt', 1.25), key('MetaRight', 'Win', 1.25), key('ContextMenu', '☰', 1.25), key('ControlRight', 'Ctrl', 1.25),
]];
