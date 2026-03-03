/**
 * Japanese Kana to Romaji keystroke length mapping.
 *
 * Used to estimate the number of keyboard inputs (romaji) needed
 * to produce each kana character via a Japanese IME.
 *
 * Uses the shortest standard romaji input for each character.
 */

// Hiragana → minimum romaji keystroke count
const hiraganaRomajiLength: Record<string, number> = {
  // Vowels (1 keystroke)
  'あ': 1, 'い': 1, 'う': 1, 'え': 1, 'お': 1,

  // K-row (2 keystrokes)
  'か': 2, 'き': 2, 'く': 2, 'け': 2, 'こ': 2,

  // S-row (2 keystrokes, し=si)
  'さ': 2, 'し': 2, 'す': 2, 'せ': 2, 'そ': 2,

  // T-row (2 keystrokes, ち=ti, つ=tu)
  'た': 2, 'ち': 2, 'つ': 2, 'て': 2, 'と': 2,

  // N-row (2 keystrokes)
  'な': 2, 'に': 2, 'ぬ': 2, 'ね': 2, 'の': 2,

  // H-row (2 keystrokes, ふ=hu)
  'は': 2, 'ひ': 2, 'ふ': 2, 'へ': 2, 'ほ': 2,

  // M-row (2 keystrokes)
  'ま': 2, 'み': 2, 'む': 2, 'め': 2, 'も': 2,

  // Y-row (2 keystrokes)
  'や': 2, 'ゆ': 2, 'よ': 2,

  // R-row (2 keystrokes)
  'ら': 2, 'り': 2, 'る': 2, 'れ': 2, 'ろ': 2,

  // W-row & N (2 keystrokes)
  'わ': 2, 'を': 2, 'ん': 2, // nn for unambiguous input

  // Voiced consonants - G (2 keystrokes)
  'が': 2, 'ぎ': 2, 'ぐ': 2, 'げ': 2, 'ご': 2,

  // Voiced consonants - Z (2 keystrokes, じ=zi)
  'ざ': 2, 'じ': 2, 'ず': 2, 'ぜ': 2, 'ぞ': 2,

  // Voiced consonants - D (2 keystrokes, ぢ=di, づ=du)
  'だ': 2, 'ぢ': 2, 'づ': 2, 'で': 2, 'ど': 2,

  // Voiced consonants - B (2 keystrokes)
  'ば': 2, 'び': 2, 'ぶ': 2, 'べ': 2, 'ぼ': 2,

  // Semi-voiced - P (2 keystrokes)
  'ぱ': 2, 'ぴ': 2, 'ぷ': 2, 'ぺ': 2, 'ぽ': 2,

  // Small kana (3 keystrokes: x + vowel/consonant)
  'ぁ': 2, 'ぃ': 2, 'ぅ': 2, 'ぇ': 2, 'ぉ': 2,
  'っ': 3, // xtu
  'ゃ': 3, 'ゅ': 3, 'ょ': 3, // xya, xyu, xyo
  'ゎ': 3, // xwa

  // Rare
  'ゐ': 2, 'ゑ': 2, // wi, we (archaic)
};

/**
 * Get the romaji keystroke length for a kana character.
 * Katakana is converted to hiragana for lookup.
 */
export function getKanaRomajiLength(char: string): number {
  // Direct hiragana lookup
  if (hiraganaRomajiLength[char] !== undefined) {
    return hiraganaRomajiLength[char];
  }

  // Katakana → Hiragana conversion (U+30A0 - U+3040 = 0x60)
  const code = char.charCodeAt(0);
  if (code >= 0x30A1 && code <= 0x30F6) {
    const hiragana = String.fromCharCode(code - 0x60);
    if (hiraganaRomajiLength[hiragana] !== undefined) {
      return hiraganaRomajiLength[hiragana];
    }
  }

  // Katakana special characters
  if (char === 'ー') return 1; // Prolonged sound mark = "-"
  if (char === '・') return 1; // Middle dot

  return null as unknown as number; // Not a kana character
}

/**
 * Check if a character is Japanese hiragana.
 */
export function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

/**
 * Check if a character is Japanese katakana.
 */
export function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x30A0 && code <= 0x30FF);
}

/**
 * Check if a character is a Japanese kana (hiragana or katakana).
 */
export function isKana(char: string): boolean {
  return isHiragana(char) || isKatakana(char);
}

/**
 * Default romaji length for Japanese kanji.
 * Most common kanji readings are 2-4 romaji characters.
 * We use 3 as a reasonable average.
 */
export const DEFAULT_KANJI_ROMAJI_LENGTH = 3;
