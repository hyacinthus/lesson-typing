/**
 * 课文元数据
 */
export interface LessonMetadata {
  id: string;
  title: string;
  grade: string;
  category?: string;
  difficulty: number;
  characterCount: number;
  chineseCharCount: number;
  order: number;
}

/**
 * 课文数据
 */
export interface Lesson {
  id: string;
  title: string;
  grade: string;
  language?: string;
  category?: string;
  difficulty: number;
  order: number;
  content: string;
  characterCount: number;
  chineseCharCount: number;
}

/**
 * 年级课文列表
 */
export interface GradeLessons {
  grade: string;
  lessons: Lesson[];
}

/**
 * 课文索引
 */
export interface LessonIndex {
  languages: LanguageConfig[];
}

export interface LanguageConfig {
  id: string;
  name: string;
  grades: GradeConfig[];
}

export interface GradeConfig {
  id: string;
  name: string;
  path: string;
}
