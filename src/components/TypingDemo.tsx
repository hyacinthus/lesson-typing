import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const TYPE_INTERVAL_MS = 160;
const RESTART_DELAY_MS = 2400;

/** Self-typing sample line on the home page, mimicking the practice view.
 *  Remount (via key) to reset when the text changes. */
export function TypingDemo() {
  const { t } = useTranslation();
  const text = t('hero_demo_text');
  const [typedCount, setTypedCount] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  // Array.from splits by code point, not UTF-16 unit, so CJK stays intact
  const chars = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(
      () => setTypedCount((count) => (count >= chars.length ? 0 : count + 1)),
      typedCount >= chars.length ? RESTART_DELAY_MS : TYPE_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [typedCount, chars, reducedMotion]);

  const shown = reducedMotion ? chars.length : Math.min(typedCount, chars.length);

  return (
    <div className="text-xl md:text-2xl tracking-wide text-center" aria-hidden="true">
      <span className="text-char-correct">{chars.slice(0, shown).join('')}</span>
      {!reducedMotion && (
        <span className="inline-block w-0.5 h-[1.1em] align-text-bottom bg-primary animate-blink" />
      )}
      <span className="text-char-pending">{chars.slice(shown).join('')}</span>
    </div>
  );
}
