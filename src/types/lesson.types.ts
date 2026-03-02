/**
 * 课文元数据
 */
export interface LessonMetadata {
  id: string;
  title: string;
  collectionTitle: string; // was grade
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
  collectionTitle: string; // was grade
  collectionId: string; // was gradeId
  language?: string;
  category?: string;
  difficulty: number;
  order: number;
  content: string;
  characterCount: number;
  chineseCharCount: number;
}

/**
 * 课文集合（原年级）
 */
export interface LessonCollection {
  id: string;
  title: string; // was grade
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
  collections: CollectionConfig[]; // was grades
}

export interface CollectionConfig {
  id: string;
  collectionId: string; // was gradeId
  name: string;
  path: string;
}
