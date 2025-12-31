import { LessonList } from '../components/lesson/LessonList';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">小学语文课文打字练习</h1>
        <p className="text-gray-600">选择一篇课文开始练习</p>
      </div>
      <LessonList />
    </div>
  );
}
