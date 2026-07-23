// Lenient punctuation matching. IMEs make the exact punctuation form hard to
// control (full/half width mode, smart quotes alternating left/right), so
// typing any variant within a class counts as the expected character.
// 、 is deliberately unmapped: giving it a half-width equivalent (e.g. ',')
// would erase the real comma/顿号 distinction. Multi-char forms (…… vs ...,
// —— vs --) are also out of scope for per-character matching.
const EQUIVALENCE_CLASSES: string[][] = [
  ['，', ','],
  ['。', '.'],
  ['；', ';'],
  ['：', ':'],
  ['？', '?'],
  ['！', '!'],
  ['（', '('],
  ['）', ')'],
  ['【', '['],
  ['】', ']'],
  ['｛', '{'],
  ['｝', '}'],
  ['《', '<'],
  ['》', '>'],
  ['～', '~'],
  ['　', ' '],
  // Quotes also match across left/right: the keyboard has one key for both
  // halves and the IME's alternation state rarely lines up with the text.
  ['“', '”', '"'],
  ['‘', '’', "'"],
];

const classOf = new Map<string, number>();
EQUIVALENCE_CLASSES.forEach((cls, classIndex) =>
  cls.forEach(char => classOf.set(char, classIndex))
);

export function charMatches(input: string, expected: string): boolean {
  if (input === expected) {
    return true;
  }
  const inputClass = classOf.get(input);
  return inputClass !== undefined && inputClass === classOf.get(expected);
}

// Paired punctuation that an auto-pairing IME may commit as one unit when the
// user types a single quote/bracket key. Only full-width/curly forms belong
// here: half-width pairs are typed as individual keystrokes (browsers never
// batch them into one event), so listing them could only ever swallow a real
// keypress.
const PAIRS = [
  ['“', '”'], ['‘', '’'],
  ['（', '）'], ['《', '》'], ['〈', '〉'], ['【', '】'], ['〔', '〕'],
  ['「', '」'], ['『', '』'], ['｛', '｝'],
];
const AUTO_PAIRS = new Set(PAIRS.map(([opening, closing]) => opening + closing));

function matchesExpected(input: string, expected: string | undefined): boolean {
  return expected !== undefined && charMatches(input, expected);
}

// Decide which committed characters to consume against the upcoming expected
// characters. When an auto-paired pair anywhere in the commit does not fit the
// text (e.g. the IME committed “” but the lesson only has the opening quote
// here), keep the half that belongs at the cursor and drop the other instead
// of failing the next position. expectedNext is aligned with the characters
// actually consumed, so it never needs more entries than chars has; near the
// end of the lesson it may hold fewer, and missing entries simply never match.
export function resolveInputChars(chars: string[], expectedNext: string[]): string[] {
  const resolved: string[] = [];
  let expectedIndex = 0;
  for (let i = 0; i < chars.length; i++) {
    const isPairStart = i + 1 < chars.length && AUTO_PAIRS.has(chars[i] + chars[i + 1]);
    if (!isPairStart) {
      resolved.push(chars[i]);
      expectedIndex++;
      continue;
    }
    const opening = chars[i];
    const closing = chars[i + 1];
    const expectedHere = expectedNext[expectedIndex];
    if (
      matchesExpected(opening, expectedHere) &&
      matchesExpected(closing, expectedNext[expectedIndex + 1])
    ) {
      // The lesson text genuinely contains the pair (e.g. empty quotes).
      resolved.push(opening, closing);
      expectedIndex += 2;
    } else if (matchesExpected(opening, expectedHere)) {
      resolved.push(opening);
      expectedIndex++;
    } else if (matchesExpected(closing, expectedHere)) {
      resolved.push(closing);
      expectedIndex++;
    } else {
      // Neither half belongs here — consume both so accuracy stays honest.
      resolved.push(opening, closing);
      expectedIndex += 2;
    }
    // Every pair branch consumed two input characters.
    i++;
  }
  return resolved;
}
