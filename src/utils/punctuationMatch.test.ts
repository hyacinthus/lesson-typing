import { charMatches, resolveInputChars } from './punctuationMatch.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ ' + message);
    process.exit(1);
  }
}

console.log('Running tests for charMatches...');

// Exact matches
assert(charMatches('a', 'a'), 'identical letters should match');
assert(charMatches('你', '你'), 'identical hanzi should match');
assert(charMatches('，', '，'), 'identical punctuation should match');

// Full/half width equivalence, both directions
assert(charMatches(',', '，'), 'half-width comma should match full-width');
assert(charMatches('，', ','), 'full-width comma should match half-width');
assert(charMatches('.', '。'), 'period should match 。');
assert(charMatches('?', '？'), '? should match ？');
assert(charMatches('!', '！'), '! should match ！');
assert(charMatches(':', '：'), ': should match ：');
assert(charMatches(';', '；'), '; should match ；');
assert(charMatches('(', '（'), '( should match （');
assert(charMatches(')', '）'), ') should match ）');
assert(charMatches('[', '【'), '[ should match 【');
assert(charMatches(']', '】'), '] should match 】');
assert(charMatches('<', '《'), '< should match 《');
assert(charMatches('>', '》'), '> should match 》');

// Quotes: straight and left/right variants are interchangeable
assert(charMatches('"', '“'), 'straight double quote should match “');
assert(charMatches('"', '”'), 'straight double quote should match ”');
assert(charMatches('“', '”'), 'left double quote should match right');
assert(charMatches("'", '‘'), "straight single quote should match ‘");
assert(charMatches('’', '‘'), 'right single quote should match left');

// Non-matches
assert(!charMatches('，', '。'), 'comma should not match period');
assert(!charMatches(',', '.'), 'half-width comma should not match period');
assert(!charMatches('、', ','), '顿号 should not match comma');
assert(!charMatches('(', '）'), 'brackets should not match across left/right');
assert(!charMatches(')', '（'), 'brackets should not match across right/left');
assert(!charMatches('“', "'"), 'double quote should not match single quote');
assert(!charMatches('a', 'b'), 'different letters should not match');
assert(!charMatches('你', '好'), 'different hanzi should not match');

console.log('✅ All charMatches tests passed!');

console.log('\nRunning tests for resolveInputChars...');

function assertChars(text: string, expectedNext: string[], expected: string[], message: string) {
  const actual = resolveInputChars(Array.from(text), expectedNext);
  assert(
    actual.length === expected.length && actual.every((c, i) => c === expected[i]),
    `${message} (expected [${expected.join(', ')}], got [${actual.join(', ')}])`
  );
}

// Plain text passes through untouched
assertChars('你好', ['你', '好'], ['你', '好'], 'plain words pass through');
assertChars('你', ['你'], ['你'], 'single char passes through');
assertChars('，', ['，'], ['，'], 'single punctuation passes through');

// Auto-paired commit at an opening position keeps only the opening half
assertChars('“”', ['“', '你'], ['“'], 'auto-paired quotes keep opening half');
assertChars('“”', ['"', '你'], ['“'], 'opening half matches leniently');
assertChars('（）', ['（', '话'], ['（'], 'auto-paired brackets keep opening half');

// Half-width pairs are typed as individual keystrokes, never auto-paired
assertChars('()', ['（', '话'], ['(', ')'], 'half-width pair is not treated as auto-pair');
assertChars('""', ['"', 'a'], ['"', '"'], 'straight quotes are not treated as auto-pair');

// Auto-paired commit at a closing position keeps only the closing half
assertChars('（）', ['）', '。'], ['）'], 'auto-paired brackets keep closing half');
assertChars('【】', ['】'], ['】'], 'closing half works at end of text');

// Closing quote at end of text: either half is accepted leniently, consume one
{
  const resolved = resolveInputChars(['“', '”'], ['”']);
  assert(resolved.length === 1, `quote pair at closing position should consume one char, got ${resolved.length}`);
}

// The lesson text genuinely contains the pair — keep both halves
assertChars('“”', ['“', '”'], ['“', '”'], 'genuine empty pair keeps both');

// Pair matching nothing at the cursor — feed both, judged as errors
assertChars('“”', ['你', '好'], ['“', '”'], 'unmatched pair passes through');

// Two chars that are not a known pair pass through
assertChars('）（', ['）', '。'], ['）', '（'], 'reversed pair is not treated as auto-pair');

// A pair embedded in a longer commit is still resolved at its own offset
assertChars('你好“”', ['你', '好', '“', '就'], ['你', '好', '“'], 'pair after composed words keeps opening half');
assertChars('说完”', ['说', '完', '”'], ['说', '完', '”'], 'closing quote after words passes through');
assertChars('他说（）', ['他', '说', '（', '这'], ['他', '说', '（'], 'brackets after composed words keep opening half');
assertChars('“”后面', ['“', '后', '面'], ['“', '后', '面'], 'pair at start of longer commit keeps opening half');
assertChars('他说“”', ['他', '说', '”'], ['他', '说', '“'], 'pair at closing position consumes one lenient half');

console.log('✅ All resolveInputChars tests passed!');
