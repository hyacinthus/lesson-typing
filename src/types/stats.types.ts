/**
 * 练习记录
 */
export interface PracticeRecord {
  id: string;
  lessonId: string;
  lessonTitle: string;
  duration: number;
  characterSpeed: number;
  chineseSpeed: number;
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
  totalPractices: number;
  bestSpeed: number;
  averageAccuracy: number;
  lastPracticed: string | null;
}
