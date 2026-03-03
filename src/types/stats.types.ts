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
  completedAt: string;
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
