import type { TypingSession, RealtimeStats } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';
import { pinyin } from 'pinyin-pro';

/**
 * 判断是否为中文字符
 */
export function isChineseCharacter(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
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

  // 计算有效按键数（Pinyin 长度）
  const effectiveKeystrokes = typedChars.reduce((acc, charObj) => {
    // 使用用户实际输入的字符，如果为空则使用目标字符（虽然理论上不应该为空）
    const char = charObj.input || charObj.char;
    if (isChineseCharacter(char)) {
      // 获取拼音（不带声调）
      const py = pinyin(char, { toneType: 'none', type: 'array' });
      // 计算拼音字符长度
      return acc + (py.length > 0 ? py.join('').length : 0);
    }
    // 非中文字符按 1 个字符计算
    return acc + 1;
  }, 0);

  // 字符速率（字符/分钟）- 使用有效按键数计算
  const characterSpeed = durationMinutes > 0
    ? Math.round(effectiveKeystrokes / durationMinutes)
    : 0;

  // 中文速率（字/分钟） 或 WPM
  const isChineseContent = content.some(c => isChineseCharacter(c.char));
  let chineseSpeed = 0;

  if (isChineseContent) {
    const chineseChars = typedChars.filter(char =>
      isChineseCharacter(char.char) && char.status === CharacterStatus.CORRECT
    ).length;
    chineseSpeed = durationMinutes > 0
      ? Math.round(chineseChars / durationMinutes)
      : 0;
  } else {
    // 非中文内容，使用标准 WPM 计算 (每 5 个字符算 1 个词)
    chineseSpeed = durationMinutes > 0
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
    characterSpeed,
    chineseSpeed,
    accuracy,
    totalCharacters,
    correctChars,
    incorrectChars,
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
export function getGrade(accuracy: number, speed: number): {
  grade: string;
  color: string;
} {
  if (accuracy >= 95 && speed >= 200) {
    return { grade: 'S', color: 'text-purple-600' };
  } else if (accuracy >= 90 && speed >= 150) {
    return { grade: 'A', color: 'text-green-600' };
  } else if (accuracy >= 80 && speed >= 100) {
    return { grade: 'B', color: 'text-blue-600' };
  } else if (accuracy >= 70) {
    return { grade: 'C', color: 'text-yellow-600' };
  } else {
    return { grade: 'D', color: 'text-red-600' };
  }
}
