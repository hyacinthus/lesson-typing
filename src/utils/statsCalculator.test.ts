import { getScoreLevel, calculateStats } from './statsCalculator.ts';
import type { TypingSession, Character } from '../types/typing.types.ts';
import { CharacterStatus } from '../types/typing.types.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ ' + message);
    process.exit(1);
  }
}

console.log('Running tests for getScoreLevel...');

const testCases = [
  // Grade S: accuracy >= 95 and speed >= 200
  { accuracy: 95, speed: 200, expected: 'S' },
  { accuracy: 96, speed: 210, expected: 'S' },
  { accuracy: 100, speed: 300, expected: 'S' },

  // Grade A: accuracy >= 90 and speed >= 150
  { accuracy: 94, speed: 200, expected: 'A' },
  { accuracy: 95, speed: 199, expected: 'A' },
  { accuracy: 90, speed: 150, expected: 'A' },
  { accuracy: 91, speed: 160, expected: 'A' },

  // Grade B: accuracy >= 80 and speed >= 100
  { accuracy: 89, speed: 150, expected: 'B' },
  { accuracy: 90, speed: 149, expected: 'B' },
  { accuracy: 80, speed: 100, expected: 'B' },
  { accuracy: 81, speed: 110, expected: 'B' },

  // Grade C: accuracy >= 70
  { accuracy: 79, speed: 100, expected: 'C' },
  { accuracy: 80, speed: 99, expected: 'C' },
  { accuracy: 70, speed: 0, expected: 'C' },
  { accuracy: 75, speed: 50, expected: 'C' },

  // Grade D: accuracy < 70
  { accuracy: 69, speed: 300, expected: 'D' },
  { accuracy: 0, speed: 0, expected: 'D' },
];

testCases.forEach(({ accuracy, speed, expected }) => {
  const result = getScoreLevel(accuracy, speed);
  assert(result.level === expected, `getScoreLevel(${accuracy}, ${speed}) should be ${expected}, but got ${result.level}`);
  console.log(`✓ getScoreLevel(${accuracy}, ${speed}) === ${expected}`);
});

console.log('\n✅ All getScoreLevel tests passed!');

console.log('\nRunning tests for calculateStats...');

function makeSession(
  lessonId: string,
  text: string,
  typed: string,
  elapsedTime: number
): TypingSession {
  const content: Character[] = Array.from(text).map((char, index) => {
    const input = index < typed.length ? typed[index] : '';
    let status: CharacterStatus = CharacterStatus.PENDING;
    if (input) {
      status = input === char ? CharacterStatus.CORRECT : CharacterStatus.INCORRECT;
    }
    return { char, status, input, index };
  });
  return {
    lessonId,
    content,
    currentIndex: typed.length,
    startTime: 0,
    elapsedTime,
    isCompleted: typed.length >= text.length,
    trace: [],
  };
}

// English: 10 correct chars in 30s -> CPM 20, WPM (10/5)/0.5 = 4
{
  const stats = calculateStats(makeSession('test-en', 'hello world', 'hello worl', 30000));
  assert(stats.totalCharacters === 10, `en totalCharacters should be 10, got ${stats.totalCharacters}`);
  assert(stats.correctChars === 10, `en correctChars should be 10, got ${stats.correctChars}`);
  assert(stats.accuracy === 100, `en accuracy should be 100, got ${stats.accuracy}`);
  assert(stats.cpm === 20, `en cpm should be 20, got ${stats.cpm}`);
  assert(stats.wpm === 4, `en wpm should be 4, got ${stats.wpm}`);
  assert(stats.duration === 30, `en duration should be 30, got ${stats.duration}`);
  console.log('✓ English stats (cpm/wpm/accuracy/duration)');
}

// Mistakes: 1 wrong of 4 -> accuracy 75
{
  const stats = calculateStats(makeSession('test-en2', 'abcd', 'abXd', 60000));
  assert(stats.correctChars === 3, `accuracy correctChars should be 3, got ${stats.correctChars}`);
  assert(stats.incorrectChars === 1, `accuracy incorrectChars should be 1, got ${stats.incorrectChars}`);
  assert(stats.accuracy === 75, `accuracy should be 75, got ${stats.accuracy}`);
  console.log('✓ Accuracy with mistakes');
}

// Chinese: effective keystrokes use pinyin length ("你" = ni -> 2, "好" = hao -> 3)
{
  const stats = calculateStats(makeSession('test-zh', '你好', '你好', 60000));
  assert(stats.effectiveKeystrokes === 5, `zh effectiveKeystrokes should be 5, got ${stats.effectiveKeystrokes}`);
  assert(stats.cpm === 5, `zh cpm should be 5, got ${stats.cpm}`);
  assert(stats.wpm === 2, `zh wpm should be 2 (chars/min), got ${stats.wpm}`);
  console.log('✓ Chinese pinyin-weighted keystrokes');
}

// Repeated calls hit the per-lesson caches and stay consistent
{
  const first = calculateStats(makeSession('test-zh', '你好', '你', 60000));
  const second = calculateStats(makeSession('test-zh', '你好', '你好', 60000));
  assert(first.effectiveKeystrokes === 2, `cached first effectiveKeystrokes should be 2, got ${first.effectiveKeystrokes}`);
  assert(second.effectiveKeystrokes === 5, `cached second effectiveKeystrokes should be 5, got ${second.effectiveKeystrokes}`);
  console.log('✓ Cached language/weight lookups stay consistent');
}

// Zero elapsed time must not divide by zero
{
  const stats = calculateStats(makeSession('test-zero', 'abc', 'a', 0));
  assert(stats.cpm === 0 && stats.wpm === 0, `zero-duration cpm/wpm should be 0, got ${stats.cpm}/${stats.wpm}`);
  console.log('✓ Zero-duration guard');
}

// Progress rounds against full content length
{
  const stats = calculateStats(makeSession('test-prog', 'abcd', 'ab', 1000));
  assert(stats.progress === 50, `progress should be 50, got ${stats.progress}`);
  console.log('✓ Progress percentage');
}

console.log('\n✅ All calculateStats tests passed!');
