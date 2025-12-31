import type { Lesson, LessonIndex, GradeLessons } from '../types';
import type { Character } from '../types/typing.types';
import { CharacterStatus } from '../types/typing.types';

// 缓存已加载的课文
const lessonCache = new Map<string, GradeLessons>();
let indexCache: LessonIndex | null = null;

/**
 * 加载课文索引
 */
export async function loadLessonIndex(): Promise<LessonIndex> {
  if (indexCache) {
    return indexCache;
  }

  const response = await fetch('/lessons/index.json');
  if (!response.ok) {
    throw new Error('Failed to load lesson index');
  }

  const data = await response.json() as LessonIndex;
  indexCache = data;
  return data;
}

/**
 * 加载指定年级的课文列表
 */
export async function loadGradeLessons(grade: string): Promise<GradeLessons> {
  if (lessonCache.has(grade)) {
    return lessonCache.get(grade)!;
  }

  const response = await fetch(`/lessons/${encodeURIComponent(grade)}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load lessons for grade: ${grade}`);
  }

  const data = await response.json();
  lessonCache.set(grade, data);
  return data;
}

/**
 * 加载所有课文
 */
export async function loadAllLessons(): Promise<Lesson[]> {
  const index = await loadLessonIndex();
  const allLessons: Lesson[] = [];

  const promises = index.grades.map(grade => loadGradeLessons(grade));
  const gradesData = await Promise.all(promises);

  for (const gradeData of gradesData) {
    allLessons.push(...gradeData.lessons);
  }

  return allLessons.sort((a, b) => a.order - b.order);
}

/**
 * 根据ID查找课文
 */
export async function findLessonById(id: string): Promise<Lesson | null> {
  const allLessons = await loadAllLessons();
  return allLessons.find(lesson => lesson.id === id) || null;
}

/**
 * 将课文内容转换为字符数组
 */
export function lessonToCharacters(content: string): Character[] {
  return Array.from(content).map((char, index) => ({
    char,
    status: index === 0 ? CharacterStatus.CURRENT : CharacterStatus.PENDING,
    input: '',
    index,
  }));
}

/**
 * 判断是否为中文字符
 */
export function isChineseCharacter(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
}

/**
 * 统计课文字符数
 */
export function countLessonCharacters(content: string): {
  total: number;
  chinese: number;
} {
  const chars = Array.from(content);
  const total = chars.length;
  const chinese = chars.filter(isChineseCharacter).length;

  return { total, chinese };
}
