import catalogData from './generated/catalog.json';
export type Status = 'planned' | 'learning' | 'learned';
export type Theme = 'light' | 'dark' | 'system';
export const catalog = catalogData;
export const lessons = catalog.lessons;
export const chapters = catalog.chapters;
export type Lesson = typeof lessons[number];
export type Chapter = typeof chapters[number];
export interface LessonBody { id: string; markdown: string; sections: string[] }
export interface Recent { lesson_id: string; read_at: string }
export interface StudyData {
  schema_version: 1;
  statuses: Record<string, Status>;
  bookmarks: string[];
  last_read: Recent | null;
  recent: Recent[];
  theme: Theme;
  font_size: 'normal' | 'large';
}
export const STORAGE_KEY = 'circuit-notes.study.v1';
export const statusLabel: Record<Status, string> = { planned: '未开始', learning: '学习中', learned: '已掌握' };
export const lessonById = (id: string) => lessons.find(l => l.id === id);
export const chapterById = (id: string) => chapters.find(c => c.id === id);
export const lessonHref = (id: string) => '#/lesson/' + id;
export const validId = (id: unknown): id is string => typeof id === 'string' && lessons.some(l => l.id === id);
export function defaultData(): StudyData {
  return { schema_version: 1, statuses: Object.fromEntries(lessons.map(l => [l.id, l.initialStatus as Status])), bookmarks: [], last_read: null, recent: [], theme: 'system', font_size: 'normal' };
}
export function searchLessons(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return lessons.filter(l => terms.every(t => (l.title + ' ' + l.searchText).toLocaleLowerCase().includes(t)))
    .sort((a, b) => Number(terms.some(t => b.title.toLocaleLowerCase().includes(t))) - Number(terms.some(t => a.title.toLocaleLowerCase().includes(t))));
}
export function snippet(lesson: Lesson, query: string) {
  const text = lesson.searchText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  const term = query.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const at = text.toLowerCase().indexOf(term);
  const start = Math.max(0, at - 30);
  return (start ? '…' : '') + text.slice(start, start + 145) + (start + 145 < text.length ? '…' : '');
}
