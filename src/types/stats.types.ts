/**
 * 练习记录
 */
export interface PracticeRecord {
  id: string;
  lessonId: string;
  lessonTitle: string;
  duration: number;
  cpm: number; // Characters Per Minute
  wpm: number; // Words Per Minute (or Chinese Characters Per Minute)
  accuracy: number;
  totalCharacters: number;
  correctChars: number;
  incorrectChars: number;
  effectiveKeystrokes?: number; // Effective keystrokes (pinyin length for Chinese, char count for others)
  completedAt: string;
  sessionId?: string;
  trace?: number[]; // Array of relative keystroke timestamps in ms
}

/**
 * 课文统计
 */
export interface LessonStats {
  bestCpm: number;
  bestWpm: number;
  duration: number;
  achievedAt: string | null;
}
