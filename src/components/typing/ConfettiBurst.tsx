import { memo } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const CONFETTI_COLORS = ['#007FFF', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
const PIECE_COUNT = 60;

// Deterministic pseudo-random in [0, 1) so render stays pure (react-hooks/purity)
const pseudoRandom = (index: number, salt: number) => {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const PIECES = Array.from({ length: PIECE_COUNT }, (_, i) => ({
  id: i,
  left: pseudoRandom(i, 1) * 100,
  size: 6 + pseudoRandom(i, 2) * 6,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: pseudoRandom(i, 3) * 0.5,
  duration: 2.2 + pseudoRandom(i, 4) * 1.6,
  round: i % 3 === 0,
}));

/** One-shot falling confetti covering the viewport; skipped when reduced motion is preferred. */
export const ConfettiBurst = memo(function ConfettiBurst() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {PIECES.map((piece) => (
        <span
          key={piece.id}
          className={`absolute top-0 ${piece.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.round ? 1 : 0.6),
            backgroundColor: piece.color,
            opacity: 0,
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
});
