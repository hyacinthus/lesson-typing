import { describe, it, expect } from 'vitest';
import { shouldMaintainTypingFocus } from './useCompositionInput';

/** Fake event target whose closest() matches exactly one selector. */
const targetMatching = (selector: string | null) =>
  ({ closest: (s: string) => (s === selector ? {} : null) }) as unknown as EventTarget;

describe('shouldMaintainTypingFocus', () => {
  it.each([
    ['ignored element', '[data-typing-focus-ignore="true"]'],
    ['form field', 'input, textarea, select, [contenteditable]'],
    ['dialog', '[role="dialog"], [role="alertdialog"]'],
    ['dropdown', '[role="menu"], [data-radix-popper-content-wrapper]'],
  ])('releases focus for a %s', (_name, selector) => {
    expect(shouldMaintainTypingFocus(targetMatching(selector))).toBe(false);
  });

  it('keeps focus for ordinary targets and for no target', () => {
    expect(shouldMaintainTypingFocus(targetMatching(null))).toBe(true);
    expect(shouldMaintainTypingFocus(null)).toBe(true);
  });
});
