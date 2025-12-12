export interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: string;
  explanation: string;
  slides: Slide[];
  quiz: QuizQuestion[];
  homework: string[];
  createdAt: Date;
}

export interface Slide {
  title: string;
  content: string;
  notes?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'essay' | 'matching' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: 'mcq' | 'essay' | 'matching' | 'true-false' | 'fill-blank';
  questions: QuizQuestion[];
  totalPoints: number;
  duration: number;
  createdAt: Date;
}

export interface StudentPaper {
  id: string;
  studentName: string;
  answers: Record<string, string>;
  score?: number;
  feedback?: string;
  gradedAt?: Date;
}

export interface ClassAnalytics {
  subject: string;
  totalStudents: number;
  averageScore: number;
  weakTopics: WeakTopic[];
  strongTopics: string[];
  recommendations: string[];
}

export interface WeakTopic {
  topic: string;
  averageScore: number;
  studentsStruggling: number;
}

export interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  duration: number;
  alertLevel: 'high' | 'medium' | 'low';
}

export interface BehaviorLetter {
  id: string;
  studentName: string;
  issue: string;
  letter: string;
  createdAt: Date;
}

export interface RemixedLesson {
  id: string;
  originalTitle: string;
  newTitle: string;
  newExamples: string[];
  newActivities: string[];
  engagementTricks: string[];
  fullContent: string;
  createdAt: Date;
}

export interface GradedResult {
  id: string;
  studentName: string;
  score: number;
  feedback: string;
  detailedResults?: { question: string; answer: string; correct: boolean; points: number }[];
  createdAt: Date;
}

export type HistoryItemType = 'lesson' | 'exam' | 'grading' | 'remix' | 'timetable' | 'letter';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  preview: string;
  data: Lesson | Exam | GradedResult | RemixedLesson | TimetableSlot[] | BehaviorLetter;
  createdAt: Date;
}
