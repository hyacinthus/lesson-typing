import { describe, it, expect } from 'vitest';
import { charMatches, resolveInputChars } from './punctuationMatch';

describe('charMatches', () => {
  it('matches identical characters', () => {
    expect(charMatches('a', 'a')).toBe(true);
    expect(charMatches('你', '你')).toBe(true);
    expect(charMatches('，', '，')).toBe(true);
  });

  it.each([
    [',', '，'], ['，', ','], ['.', '。'], ['?', '？'], ['!', '！'], [':', '：'],
    [';', '；'], ['(', '（'], [')', '）'], ['[', '【'], [']', '】'], ['<', '《'], ['>', '》'],
  ])('treats %s and %s as equivalent widths', (a, b) => {
    expect(charMatches(a, b)).toBe(true);
  });

  it('treats straight and curly quotes as interchangeable', () => {
    expect(charMatches('"', '“')).toBe(true);
    expect(charMatches('"', '”')).toBe(true);
    expect(charMatches('“', '”')).toBe(true);
    expect(charMatches("'", '‘')).toBe(true);
    expect(charMatches('’', '‘')).toBe(true);
  });

  it.each([
    ['，', '。'], [',', '.'], ['、', ','], ['(', '）'], [')', '（'], ['“', "'"], ['a', 'b'], ['你', '好'],
  ])('does not match %s against %s', (a, b) => {
    expect(charMatches(a, b)).toBe(false);
  });
});

describe('resolveInputChars', () => {
  const resolve = (text: string, expectedNext: string[]) =>
    resolveInputChars(Array.from(text), expectedNext);

  it('passes plain text through untouched', () => {
    expect(resolve('你好', ['你', '好'])).toEqual(['你', '好']);
    expect(resolve('你', ['你'])).toEqual(['你']);
    expect(resolve('，', ['，'])).toEqual(['，']);
  });

  it('keeps only the opening half of an auto-paired commit at an opening position', () => {
    expect(resolve('“”', ['“', '你'])).toEqual(['“']);
    expect(resolve('“”', ['"', '你'])).toEqual(['“']);
    expect(resolve('（）', ['（', '话'])).toEqual(['（']);
  });

  it('never treats half-width pairs as auto-paired', () => {
    expect(resolve('()', ['（', '话'])).toEqual(['(', ')']);
    expect(resolve('""', ['"', 'a'])).toEqual(['"', '"']);
  });

  it('keeps only the closing half at a closing position', () => {
    expect(resolve('（）', ['）', '。'])).toEqual(['）']);
    expect(resolve('【】', ['】'])).toEqual(['】']);
    expect(resolve('“”', ['”'])).toHaveLength(1);
  });

  it('keeps both halves when the lesson genuinely contains the pair', () => {
    expect(resolve('“”', ['“', '”'])).toEqual(['“', '”']);
  });

  it('feeds both halves through when nothing at the cursor matches', () => {
    expect(resolve('“”', ['你', '好'])).toEqual(['“', '”']);
    expect(resolve('）（', ['）', '。'])).toEqual(['）', '（']);
  });

  it('resolves a pair embedded in a longer commit at its own offset', () => {
    expect(resolve('你好“”', ['你', '好', '“', '就'])).toEqual(['你', '好', '“']);
    expect(resolve('说完”', ['说', '完', '”'])).toEqual(['说', '完', '”']);
    expect(resolve('他说（）', ['他', '说', '（', '这'])).toEqual(['他', '说', '（']);
    expect(resolve('“”后面', ['“', '后', '面'])).toEqual(['“', '后', '面']);
    expect(resolve('他说“”', ['他', '说', '”'])).toEqual(['他', '说', '“']);
  });
});
