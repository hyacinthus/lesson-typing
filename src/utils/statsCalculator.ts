import type { TypingSession, RealtimeStats } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';
import { pinyin } from 'pinyin-pro';
import { isKana, getKanaRomajiLength, DEFAULT_KANJI_ROMAJI_LENGTH } from './japaneseRomaji';

/**
 * Check if a character is a CJK Unified Ideograph (Chinese/Japanese kanji).
 */
export function isChineseCharacter(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
}

/**
 * Detect content language type from the character set present.
 * Japanese content always contains hiragana/katakana.
 * Chinese content has CJK ideographs but no kana.
 */
type ContentLanguageType = 'japanese' | 'chinese' | 'other';

function detectContentLanguage(content: { char: string }[]): ContentLanguageType {
  const hasKana = content.some(c => isKana(c.char));
  if (hasKana) return 'japanese';

  const hasCJK = content.some(c => isChineseCharacter(c.char));
  if (hasCJK) return 'chinese';

  return 'other';
}

/**
 * Calculate the effective keystroke count for a single character
 * based on the detected content language.
 */
function getEffectiveKeystrokesForChar(char: string, lang: ContentLanguageType): number {
  if (lang === 'japanese') {
    // Kana → romaji length
    const romajiLen = getKanaRomajiLength(char);
    if (romajiLen != null) return romajiLen;

    // Kanji in Japanese context → use average romaji length
    if (isChineseCharacter(char)) return DEFAULT_KANJI_ROMAJI_LENGTH;

    // Other characters (punctuation, latin, etc.)
    return 1;
  }

  if (lang === 'chinese') {
    if (isChineseCharacter(char)) {
      const py = pinyin(char, { toneType: 'none', type: 'array' });
      return py.length > 0 ? py.join('').length : 0;
    }
    return 1;
  }

  // Other languages: 1 keystroke per character
  return 1;
}

/**
 * 计算打字统计数据
 */
export function calculateStats(session: TypingSession): RealtimeStats {
  const { content, currentIndex, elapsedTime } = session;

  // 已输入的字符
  const typedChars = content.slice(0, currentIndex);

  // 统计数据
  const totalCharacters = currentIndex;
  const correctChars = typedChars.filter(
    char => char.status === CharacterStatus.CORRECT
  ).length;
  const incorrectChars = typedChars.filter(
    char => char.status === CharacterStatus.INCORRECT
  ).length;

  // 计算时长（分钟）
  const durationMinutes = elapsedTime / 60000;

  // Detect content language for keystroke estimation
  const contentLang = detectContentLanguage(content);

  // 计算有效按键数
  const effectiveKeystrokes = typedChars.reduce((acc, charObj) => {
    const char = charObj.input || charObj.char;
    return acc + getEffectiveKeystrokesForChar(char, contentLang);
  }, 0);

  // 字符速率（字符/分钟）- 使用有效按键数计算 (CPM)
  const cpm = durationMinutes > 0
    ? Math.round(effectiveKeystrokes / durationMinutes)
    : 0;

  // WPM calculation varies by language
  let wpm = 0;

  if (contentLang === 'chinese') {
    // For Chinese: WPM = Chinese characters per minute
    const chineseChars = typedChars.filter(char =>
      isChineseCharacter(char.char) && char.status === CharacterStatus.CORRECT
    ).length;
    wpm = durationMinutes > 0
      ? Math.round(chineseChars / durationMinutes)
      : 0;
  } else if (contentLang === 'japanese') {
    // For Japanese: WPM = kana/kanji characters per minute
    const japaneseChars = typedChars.filter(char =>
      (isKana(char.char) || isChineseCharacter(char.char)) &&
      char.status === CharacterStatus.CORRECT
    ).length;
    wpm = durationMinutes > 0
      ? Math.round(japaneseChars / durationMinutes)
      : 0;
  } else {
    // For other languages: standard WPM (5 chars = 1 word)
    wpm = durationMinutes > 0
      ? Math.round((correctChars / 5) / durationMinutes)
      : 0;
  }

  // 准确率
  const accuracy = totalCharacters > 0
    ? Math.round((correctChars / totalCharacters) * 100)
    : 100;

  // 完成进度
  const progress = content.length > 0
    ? Math.round((currentIndex / content.length) * 100)
    : 0;

  return {
    duration: Math.round(elapsedTime / 1000), // 转换为秒
    cpm,
    wpm,
    accuracy,
    totalCharacters,
    correctChars,
    incorrectChars,
    effectiveKeystrokes,
    progress,
  };
}

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化速度显示
 */
export function formatSpeed(speed: number): string {
  return speed.toString();
}

/**
 * 计算等级评价
 */
export function getScoreLevel(accuracy: number, speed: number): {
  level: string;
  color: string;
} {
  // 这里的 speed 传入的是 CPM
  if (accuracy >= 95 && speed >= 200) {
    return { level: 'S', color: 'text-purple-600' };
  } else if (accuracy >= 90 && speed >= 150) {
    return { level: 'A', color: 'text-green-600' };
  } else if (accuracy >= 80 && speed >= 100) {
    return { level: 'B', color: 'text-blue-600' };
  } else if (accuracy >= 70) {
    return { level: 'C', color: 'text-yellow-600' };
  } else {
    return { level: 'D', color: 'text-red-600' };
  }
}
