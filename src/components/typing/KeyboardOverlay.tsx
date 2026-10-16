import { memo, useEffect, useState } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { MAC_KEYBOARD, PC_KEYBOARD, type KeyCap } from '../../utils/keyboardLayout';

const IS_MAC = /Macintosh|iPhone|iPad/.test(navigator.userAgent);
const ROWS = IS_MAC ? MAC_KEYBOARD : PC_KEYBOARD;
const KEY_SIZE = 18;
const KEY_GAP = 3;

type KeyboardNavigator = Navigator & {
  keyboard?: { getLayoutMap(): Promise<ReadonlyMap<string, string>> };
};

/** The labels of the user's keyboard layout, such as AZERTY's, by
 *  KeyboardEvent.code; only Chromium tells them. */
function useLayoutLabels() {
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>();
  useEffect(() => {
    let cancelled = false;
    (navigator as KeyboardNavigator).keyboard?.getLayoutMap().then(
      (map) => { if (!cancelled) setLabels(map); },
      () => { /* the US labels stay */ }
    );
    return () => { cancelled = true; };
  }, []);
  return labels;
}

// ß and the like have no single capital
function capital(label: string) {
  const upper = label.toUpperCase();
  return upper.length === 1 ? upper : label;
}

interface KeyboardOverlayProps {
  /** The typing input, whose keys light, not those of a dialog or a menu */
  inputId: string;
}

/** A translucent keyboard in the bottom right corner that lights the keys
 *  held down. Keys go by position (KeyboardEvent.code), so those an input
 *  method composes with light too. */
export const KeyboardOverlay = memo(function KeyboardOverlay({ inputId }: KeyboardOverlayProps) {
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
  const labels = useLayoutLabels();
  const labelOf = (k: KeyCap) => {
    const label = labels?.get(k.code);
    return label ? capital(label) : k.label;
  };

  useEffect(() => {
    const set = (code: string, down: boolean) => setHeld((prev) => {
      if (!code || prev.has(code) === down) return prev;
      const next = new Set(prev);
      if (down) next.add(code);
      else next.delete(code);
      return next;
    });
    const release = () => setHeld((prev) => (prev.size ? new Set() : prev));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.id === inputId) set(e.code, true);
    };
    // While Command is held, macOS sends no keyup for the other keys: they
    // go up with it, but for the modifiers still held
    const releaseWithCommand = (e: KeyboardEvent) => setHeld((prev) => new Set([...prev].filter((code) =>
      (e.shiftKey && code.startsWith('Shift')) || (e.ctrlKey && code.startsWith('Control')) || (e.altKey && code.startsWith('Alt'))
    )));
    const onKeyUp = (e: KeyboardEvent) =>
      IS_MAC && e.code.startsWith('Meta') ? releaseWithCommand(e) : set(e.code, false);
    // Capture, ahead of handlers that stop the keys
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', release);
    };
  }, [inputId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-4 bottom-4 z-20 hidden flex-col rounded-xl border border-border/60 bg-background/40 p-2 md:flex"
      style={{ gap: KEY_GAP }}
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex" style={{ gap: KEY_GAP }}>
          {row.map((k) => (
            <Kbd
              key={k.code}
              className={cn(
                'min-w-0 rounded-[4px] border px-0 text-[10px] leading-none font-normal',
                held.has(k.code)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-foreground/15 bg-foreground/5 text-foreground/45 transition-colors duration-200'
              )}
              style={{ width: k.width * KEY_SIZE + (k.width - 1) * KEY_GAP, height: KEY_SIZE }}
            >
              {labelOf(k)}
            </Kbd>
          ))}
        </div>
      ))}
    </div>
  );
});
