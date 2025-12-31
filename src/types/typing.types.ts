/**
 * 字符状态常量
 */
export const CharacterStatus = {
  PENDING: 'pending', // 未输入
  CURRENT: 'current', // 当前输入位置
  CORRECT: 'correct', // 正确
  INCORRECT: 'incorrect', // 错误
} as const;

export type CharacterStatus = (typeof CharacterStatus)[keyof typeof CharacterStatus];

/**
 * 单个字符的数据结构
 */
export interface Character {
  char: string; // 字符本身
  status: CharacterStatus; // 当前状态
  input: string; // 用户输入的字符（用于错误对比）
  index: number; // 在文本中的位置
}

/**
 * 打字会话状态
 */
export interface TypingSession {
  lessonId: string; // 课文 ID
  content: Character[]; // 字符数组
  currentIndex: number; // 当前输入位置
  startTime: number | null; // 开始时间（时间戳）
  elapsedTime: number; // 已用时间（毫秒）
  isPaused: boolean; // 是否暂停
  isCompleted: boolean; // 是否完成
  compositionText: string; // 输入法组合文本
}

/**
 * 实时统计数据
 */
export interface RealtimeStats {
  duration: number; // 练习时长（秒）
  characterSpeed: number; // 字符速率（字符/分钟）
  chineseSpeed: number; // 中文速率（字/分钟）
  accuracy: number; // 准确率（0-100）
  totalCharacters: number; // 总字符数
  correctChars: number; // 正确字符数
  incorrectChars: number; // 错误字符数
  progress: number; // 完成进度（0-100）
}
