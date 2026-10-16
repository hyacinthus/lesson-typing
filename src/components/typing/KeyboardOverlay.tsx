import { memo, useEffect, useState, type CSSProperties } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import type { KeyboardMode } from '@/stores/keyboardStore';
import { MAC_KEYBOARD, PC_KEYBOARD, type KeyCap } from '../../utils/keyboardLayout';

const IS_MAC = /Macintosh|iPhone|iPad/.test(navigator.userAgent);
const ROWS = IS_MAC ? MAC_KEYBOARD : PC_KEYBOARD;

// The looks of the keyboards, whose keys are --u apart with --g between
// them: the corner's, faint, with keys 18px wide; the large one's, unseen
// but for the keys held and fading, 15 keys across the window and 5 rows in
// its bottom half.
interface Look {
  keyboard: string;
  /** --u and --g */
  style: CSSProperties;
  key: string;
  held: string;
  free: string;
  keyStyle?: CSSProperties;
}

const LOOKS: Record<Exclude<KeyboardMode, 'off'>, Look> = {
  corner: {
    keyboard: 'right-4 bottom-4 rounded-xl border border-border/40 bg-background/15 p-2',
    style: { '--u': '21px', '--g': '3px' } as CSSProperties,
    key: 'rounded-[4px] border-foreground/10 text-[10px]',
    held: 'border-primary/80 bg-primary/80 text-primary-foreground',
    free: 'bg-transparent text-foreground/25 transition-colors duration-300',
  },
  large: {
    keyboard: 'inset-x-0 bottom-0 h-1/2 items-center justify-end pb-6',
    style: { '--u': 'min(calc((100vw - 48px) / 15), calc((50vh - 24px) / 5))', '--g': 'calc(var(--u) / 10)' } as CSSProperties,
    key: 'rounded-[calc(var(--u)/6)] border-primary/40 bg-primary/15 text-[length:calc(var(--u)/3)] text-primary/70',
    held: 'opacity-100',
    free: 'opacity-0 transition-opacity duration-500 ease-out',
    keyStyle: { boxShadow: '0 0 calc(var(--u) / 2) color-mix(in oklab, var(--primary) 30%, transparent)' },
  },
};

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

/** The codes of the keys held down in the input of inputId. */
function useHeldKeys(inputId: string) {
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
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
  return held;
}

// ß and the like have no single capital
function capital(label: string) {
  const upper = label.toUpperCase();
  return upper.length === 1 ? upper : label;
}

interface KeyboardOverlayProps {
  /** The typing input, whose keys light, not those of a dialog or a menu */
  inputId: string;
  mode: keyof typeof LOOKS;
}

/** The keys held down, shown on a faint keyboard in the bottom right
 *  corner, or glowing dimly where they are on a large unseen keyboard over
 *  the bottom half of the window; let go of, they fade out. Keys go by
 *  position (KeyboardEvent.code), so those an input method composes with
 *  show too. */
export const KeyboardOverlay = memo(function KeyboardOverlay({ inputId, mode }: KeyboardOverlayProps) {
  const held = useHeldKeys(inputId);
  const labels = useLayoutLabels();
  const labelOf = (k: KeyCap) => {
    const label = labels?.get(k.code);
    return label ? capital(label) : k.label;
  };

  const look = LOOKS[mode];
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed z-20 hidden flex-col gap-(--g) md:flex', look.keyboard)}
      style={look.style}
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-(--g)">
          {row.map((k) => (
            <Kbd
              key={k.code}
              className={cn(
                'h-[calc(var(--u)-var(--g))] min-w-0 border px-0 leading-none font-normal',
                look.key,
                held.has(k.code) ? look.held : look.free
              )}
              style={{ width: `calc(var(--u) * ${k.width} - var(--g))`, ...look.keyStyle }}
            >
              {labelOf(k)}
            </Kbd>
          ))}
        </div>
      ))}
    </div>
  );
});
