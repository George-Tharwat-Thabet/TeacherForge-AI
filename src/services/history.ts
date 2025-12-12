import type { HistoryItem, HistoryItemType, Lesson, Exam, GradedResult, RemixedLesson, TimetableSlot, BehaviorLetter } from '../types';

const STORAGE_KEY = 'teacherforge_history';
const MAX_ITEMS = 100;

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const items = JSON.parse(stored);
    return items.map((item: HistoryItem) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }));
  } catch {
    return [];
  }
};

export const saveToHistory = (
  type: HistoryItemType,
  title: string,
  preview: string,
  data: Lesson | Exam | GradedResult | RemixedLesson | TimetableSlot[] | BehaviorLetter
): HistoryItem => {
  const history = getHistory();
  
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    type,
    title,
    preview,
    data,
    createdAt: new Date()
  };
  
  // Add to beginning and limit size
  const updated = [newItem, ...history].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  return newItem;
};

export const deleteFromHistory = (id: string): void => {
  const history = getHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getHistoryByType = (type: HistoryItemType): HistoryItem[] => {
  return getHistory().filter(item => item.type === type);
};

export const getTypeLabel = (type: HistoryItemType): string => {
  const labels: Record<HistoryItemType, string> = {
    lesson: 'Lesson',
    exam: 'Exam',
    grading: 'Grading',
    remix: 'Remix',
    timetable: 'Timetable',
    letter: 'Letter'
  };
  return labels[type];
};

export const getTypeIcon = (type: HistoryItemType): string => {
  const icons: Record<HistoryItemType, string> = {
    lesson: '📚',
    exam: '📝',
    grading: '✅',
    remix: '✨',
    timetable: '📅',
    letter: '✉️'
  };
  return icons[type];
};
