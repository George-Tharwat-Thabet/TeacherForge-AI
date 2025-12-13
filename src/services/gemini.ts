import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Lesson, Exam, QuizQuestion, ClassAnalytics, TimetableSlot, BehaviorLetter, RemixedLesson } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const getModel = () => {
  if (!genAI) throw new Error('Gemini API key not configured');
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

export const generateLessonFromImage = async (imageBase64: string, mimeType: string): Promise<Lesson> => {
  const model = getModel();
  
  const prompt = `Analyze this textbook page image and generate a complete lesson plan. Return a JSON object with:
{
  "title": "lesson title",
  "subject": "subject name",
  "grade": "grade level",
  "explanation": "comprehensive, in-depth explanation of the topic",
  "slides": [{"title": "slide title", "content": "slide content", "notes": "teacher notes"}],
  "quiz": [{"question": "question text", "type": "mcq", "options": ["a", "b", "c", "d"], "correctAnswer": "a", "points": 10}],
  "homework": ["homework task 1", "homework task 2"]
}

IMPORTANT - For the "explanation" field, provide a thorough and comprehensive explanation that includes:
1. An engaging introduction that hooks students and explains why this topic matters
2. Clear definitions of all key terms and concepts with simple language
3. Step-by-step breakdown of the main ideas with logical progression
4. Multiple real-world examples and practical applications students can relate to
5. Common misconceptions or mistakes to avoid
6. Connections to previously learned material or other subjects
7. Visual descriptions or analogies that help students visualize abstract concepts
8. A summary of the key takeaways

The explanation should be 5-8 substantial paragraphs, written in an engaging teacher-friendly tone that can be read aloud or used as lecture notes. Use markdown formatting with headers (##), bullet points, and numbered lists to organize the content clearly.

Generate 5-7 slides, 5 quiz questions, and 3-5 homework tasks. Return ONLY valid JSON.`;

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    prompt
  ]);
  
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date()
  };
};

export const generateLessonFromMultipleFiles = async (
  files: { base64: string; mimeType: string }[]
): Promise<Lesson> => {
  const model = getModel();
  
  const fileParts = files.map(f => ({
    inlineData: { data: f.base64, mimeType: f.mimeType }
  }));

  const prompt = `Analyze these textbook/lesson page images and generate a comprehensive lesson plan combining all the content. Return a JSON object with:
{
  "title": "lesson title",
  "subject": "subject name",
  "grade": "grade level",
  "explanation": "comprehensive, in-depth explanation of the topic",
  "slides": [{"title": "slide title", "content": "slide content", "notes": "teacher notes"}],
  "quiz": [{"question": "question text", "type": "mcq", "options": ["a", "b", "c", "d"], "correctAnswer": "a", "points": 10}],
  "homework": ["homework task 1", "homework task 2"]
}

IMPORTANT - For the "explanation" field, provide a thorough and comprehensive explanation that includes:
1. An engaging introduction that hooks students and explains why this topic matters
2. Clear definitions of all key terms and concepts with simple language
3. Step-by-step breakdown of the main ideas with logical progression
4. Multiple real-world examples and practical applications students can relate to
5. Common misconceptions or mistakes to avoid
6. Connections to previously learned material or other subjects
7. Visual descriptions or analogies that help students visualize abstract concepts
8. A summary of the key takeaways

The explanation should be 5-8 substantial paragraphs, written in an engaging teacher-friendly tone that can be read aloud or used as lecture notes. Use markdown formatting with headers (##), bullet points, and numbered lists to organize the content clearly.

Generate 5-7 slides, 5 quiz questions, and 3-5 homework tasks. Return ONLY valid JSON.`;

  const result = await model.generateContent([...fileParts, prompt]);
  
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date()
  };
};

export const generateExam = async (
  subject: string,
  topic: string,
  grade: string,
  type: Exam['type'],
  questionCount: number
): Promise<Exam> => {
  const model = getModel();
  
  const typeInstructions: Record<string, string> = {
    'mcq': 'multiple choice questions with 4 options each',
    'essay': 'essay questions requiring detailed written answers',
    'matching': 'matching questions with items to match',
    'true-false': 'true or false statements',
    'fill-blank': 'fill in the blank sentences'
  };

  const prompt = `Generate ${questionCount} ${typeInstructions[type]} for ${subject}, topic: "${topic}", grade level: ${grade}.
Return JSON: {
  "title": "exam title",
  "questions": [{"question": "text", "type": "${type}", "options": ["a","b","c","d"], "correctAnswer": "answer", "points": 10}],
  "duration": minutes
}
For essay type, options should be empty array. For matching, options are items to match. Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return {
    id: crypto.randomUUID(),
    subject,
    grade,
    type,
    ...data,
    totalPoints: data.questions.reduce((sum: number, q: QuizQuestion) => sum + q.points, 0),
    createdAt: new Date()
  };
};

export const generateExamFromImages = async (
  images: { base64: string; mimeType: string }[],
  type: Exam['type'],
  questionCount: number
): Promise<Exam> => {
  const model = getModel();
  
  const typeInstructions: Record<string, string> = {
    'mcq': 'multiple choice questions with 4 options each',
    'essay': 'essay questions requiring detailed written answers',
    'matching': 'matching questions with items to match',
    'true-false': 'true or false statements',
    'fill-blank': 'fill in the blank sentences'
  };

  const imageParts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  const prompt = `Analyze these lesson/textbook page images and generate ${questionCount} ${typeInstructions[type]} based on the content.
Extract the subject, topic, and grade level from the images.

Return JSON: {
  "title": "exam title based on content",
  "subject": "detected subject",
  "grade": "detected grade level",
  "questions": [{"question": "text", "type": "${type}", "options": ["a","b","c","d"], "correctAnswer": "answer", "points": 10}],
  "duration": minutes
}
For essay type, options should be empty array. For matching, options are items to match. Return ONLY valid JSON.`;

  const result = await model.generateContent([...imageParts, prompt]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return {
    id: crypto.randomUUID(),
    subject: data.subject || 'Unknown',
    grade: data.grade || 'Unknown',
    type,
    ...data,
    totalPoints: data.questions.reduce((sum: number, q: QuizQuestion) => sum + q.points, 0),
    createdAt: new Date()
  };
};

// Multi-type exam generation
export const generateExamMultiType = async (
  subject: string,
  topic: string,
  grade: string,
  typeConfig: Record<string, number> // { typeId: questionCount }
): Promise<Exam> => {
  const model = getModel();
  
  const typeLabels: Record<string, string> = {
    'mcq': 'Multiple Choice (4 options each)',
    'essay': 'Essay (open-ended, detailed answer)',
    'matching': 'Matching (items to match)',
    'true-false': 'True/False',
    'fill-blank': 'Fill in the Blank (with ___ in question)'
  };

  const typeRequests = Object.entries(typeConfig)
    .map(([type, count]) => `- EXACTLY ${count} ${typeLabels[type]} questions (type: "${type}")`)
    .join('\n');

  const totalQuestions = Object.values(typeConfig).reduce((sum, count) => sum + count, 0);

  const prompt = `Generate an exam for ${subject}, topic: "${topic}", grade level: ${grade}.

YOU MUST GENERATE EXACTLY THESE QUESTIONS:
${typeRequests}

TOTAL: ${totalQuestions} questions. DO NOT generate fewer or more.

Return JSON:
{
  "title": "exam title",
  "questions": [
    {"question": "text", "type": "mcq", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "points": 10},
    {"question": "text", "type": "essay", "options": [], "correctAnswer": "sample answer", "points": 20},
    {"question": "text", "type": "matching", "options": ["Item1 - Match1", "Item2 - Match2"], "correctAnswer": "Item1-Match1, Item2-Match2", "points": 10},
    {"question": "statement", "type": "true-false", "options": [], "correctAnswer": "True", "points": 5},
    {"question": "The ___ is the capital.", "type": "fill-blank", "options": [], "correctAnswer": "Paris", "points": 10}
  ],
  "duration": ${Math.ceil(totalQuestions * 2)} 
}

CRITICAL RULES:
1. Generate EXACTLY the number of questions specified for EACH type - no more, no less
2. MCQ must have exactly 4 options
3. Essay and true-false have empty options array
4. Fill-blank questions must contain ___ in the question text
5. Every question must have the correct "type" field matching its category

Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  const primaryType = Object.keys(typeConfig)[0] as Exam['type'];
  
  return {
    id: crypto.randomUUID(),
    subject,
    grade,
    type: primaryType,
    ...data,
    totalPoints: data.questions.reduce((sum: number, q: QuizQuestion) => sum + q.points, 0),
    createdAt: new Date()
  };
};

export const generateExamFromImagesMultiType = async (
  images: { base64: string; mimeType: string }[],
  typeConfig: Record<string, number>
): Promise<Exam> => {
  const model = getModel();
  
  const typeLabels: Record<string, string> = {
    'mcq': 'Multiple Choice (4 options each)',
    'essay': 'Essay (open-ended, detailed answer)',
    'matching': 'Matching (items to match)',
    'true-false': 'True/False',
    'fill-blank': 'Fill in the Blank (with ___ in question)'
  };

  const imageParts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  const typeRequests = Object.entries(typeConfig)
    .map(([type, count]) => `- EXACTLY ${count} ${typeLabels[type]} questions (type: "${type}")`)
    .join('\n');

  const totalQuestions = Object.values(typeConfig).reduce((sum, count) => sum + count, 0);

  const prompt = `Analyze these lesson/textbook images and generate an exam based on the content.
Extract the subject, topic, and grade level from the images.

YOU MUST GENERATE EXACTLY THESE QUESTIONS:
${typeRequests}

TOTAL: ${totalQuestions} questions. DO NOT generate fewer or more.

Return JSON:
{
  "title": "exam title based on content",
  "subject": "detected subject",
  "grade": "detected grade level",
  "questions": [
    {"question": "text", "type": "mcq", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "points": 10},
    {"question": "text", "type": "essay", "options": [], "correctAnswer": "sample answer", "points": 20},
    {"question": "text", "type": "matching", "options": ["Item1 - Match1", "Item2 - Match2"], "correctAnswer": "Item1-Match1, Item2-Match2", "points": 10},
    {"question": "statement", "type": "true-false", "options": [], "correctAnswer": "True", "points": 5},
    {"question": "The ___ is the capital.", "type": "fill-blank", "options": [], "correctAnswer": "Paris", "points": 10}
  ],
  "duration": ${Math.ceil(totalQuestions * 2)}
}

CRITICAL RULES:
1. Generate EXACTLY the number of questions specified for EACH type - no more, no less
2. MCQ must have exactly 4 options
3. Essay and true-false have empty options array
4. Fill-blank questions must contain ___ in the question text
5. Every question must have the correct "type" field matching its category

Return ONLY valid JSON.`;

  const result = await model.generateContent([...imageParts, prompt]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  const primaryType = Object.keys(typeConfig)[0] as Exam['type'];
  
  return {
    id: crypto.randomUUID(),
    subject: data.subject || 'Unknown',
    grade: data.grade || 'Unknown',
    type: primaryType,
    ...data,
    totalPoints: data.questions.reduce((sum: number, q: QuizQuestion) => sum + q.points, 0),
    createdAt: new Date()
  };
};

export const gradeExamPapers = async (
  exam: Exam,
  papers: { studentName: string; answers: Record<string, string> }[]
): Promise<{ studentName: string; score: number; feedback: string }[]> => {
  const model = getModel();
  
  const prompt = `Grade these exam papers and provide personalized feedback.
Exam: ${JSON.stringify(exam.questions)}
Papers: ${JSON.stringify(papers)}

Return JSON array: [{"studentName": "name", "score": percentage, "feedback": "personalized encouraging feedback mentioning specific strengths and areas to improve"}]
Return ONLY valid JSON array.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  return JSON.parse(jsonMatch[0]);
};

export const gradeFromImages = async (
  studentName: string,
  images: { base64: string; mimeType: string }[]
): Promise<{ studentName: string; score: number; feedback: string; detailedResults: { question: string; answer: string; correct: boolean; points: number }[] }> => {
  const model = getModel();
  
  const imageParts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  const prompt = `Analyze these answer sheet images for student "${studentName}". 
Extract the questions and answers, evaluate correctness, and provide grading.

Return JSON: {
  "studentName": "${studentName}",
  "score": percentage (0-100),
  "feedback": "personalized encouraging feedback mentioning specific strengths and areas to improve",
  "detailedResults": [
    {"question": "extracted question", "answer": "student's answer", "correct": true/false, "points": points earned}
  ]
}
Return ONLY valid JSON.`;

  const result = await model.generateContent([...imageParts, prompt]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  return JSON.parse(jsonMatch[0]);
};

export const analyzeClassPerformance = async (
  subject: string,
  scores: { topic: string; studentName: string; score: number }[]
): Promise<ClassAnalytics> => {
  const model = getModel();
  
  const prompt = `Analyze class performance data and identify weak topics.
Subject: ${subject}
Scores: ${JSON.stringify(scores)}

Return JSON: {
  "subject": "${subject}",
  "totalStudents": number,
  "averageScore": number,
  "weakTopics": [{"topic": "name", "averageScore": number, "studentsStruggling": number}],
  "strongTopics": ["topic1", "topic2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  return JSON.parse(jsonMatch[0]);
};

export const generateRevisionLesson = async (weakTopic: string, subject: string, grade: string): Promise<Lesson> => {
  const model = getModel();
  
  const prompt = `Create a targeted revision lesson for students struggling with "${weakTopic}" in ${subject}, grade ${grade}.
Focus on common misconceptions and provide clear explanations with examples.

Return JSON: {
  "title": "Revision: ${weakTopic}",
  "subject": "${subject}",
  "grade": "${grade}",
  "explanation": "detailed explanation addressing common mistakes",
  "slides": [{"title": "title", "content": "content", "notes": "notes"}],
  "quiz": [{"question": "text", "type": "mcq", "options": ["a","b","c","d"], "correctAnswer": "a", "points": 10}],
  "homework": ["practice task 1", "practice task 2"]
}
Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
};

export const generateTimetable = async (
  subjects: { name: string; hoursPerWeek: number; difficulty: 'heavy' | 'medium' | 'light' }[]
): Promise<TimetableSlot[]> => {
  const model = getModel();
  
  const prompt = `Create an optimal weekly timetable scheduling heavy subjects when students are most alert (morning hours).
Subjects: ${JSON.stringify(subjects)}
School hours: 8:00 AM - 3:00 PM, Monday-Friday, 45-minute periods.

Return JSON array: [{"day": "Monday", "time": "8:00 AM", "subject": "Math", "duration": 45, "alertLevel": "high"}]
alertLevel: "high" for morning (8-10am), "medium" for mid-day (10am-1pm), "low" for afternoon (1-3pm).
Schedule heavy subjects during high alert times. Return ONLY valid JSON array.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const slots = JSON.parse(jsonMatch[0]);
  return slots.map((slot: TimetableSlot) => ({ ...slot, id: crypto.randomUUID() }));
};

export const generateBehaviorLetter = async (studentName: string, issue: string): Promise<BehaviorLetter> => {
  const model = getModel();
  
  const prompt = `Write a professional, polite parent letter about a student behavior issue.
Student: ${studentName}
Issue: ${issue}

The letter should be:
- Professional and respectful
- Express concern without being accusatory
- Suggest collaboration between school and parents
- End on a positive note

Return JSON: {"letter": "full letter text"}
Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return {
    id: crypto.randomUUID(),
    studentName,
    issue,
    letter: data.letter,
    createdAt: new Date()
  };
};

export const remixLesson = async (originalLesson: string): Promise<RemixedLesson> => {
  const model = getModel();
  
  const prompt = `Remix this lesson with fresh examples, new activities, and engagement tricks.
Original lesson: ${originalLesson}

Return JSON: {
  "originalTitle": "extracted title",
  "newTitle": "refreshed title",
  "newExamples": ["example 1", "example 2", "example 3"],
  "newActivities": ["activity 1", "activity 2"],
  "engagementTricks": ["trick 1", "trick 2"],
  "fullContent": "complete remixed lesson content"
}
Return ONLY valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
};

export const remixLessonFromImages = async (
  images: { base64: string; mimeType: string }[]
): Promise<RemixedLesson> => {
  const model = getModel();
  
  const imageParts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  const prompt = `Analyze these lesson/textbook page images and remix the content with fresh examples, new activities, and engagement tricks.

Return JSON: {
  "originalTitle": "extracted title from images",
  "newTitle": "refreshed title",
  "newExamples": ["example 1", "example 2", "example 3"],
  "newActivities": ["activity 1", "activity 2"],
  "engagementTricks": ["trick 1", "trick 2"],
  "fullContent": "complete remixed lesson content"
}
Return ONLY valid JSON.`;

  const result = await model.generateContent([...imageParts, prompt]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  
  const data = JSON.parse(jsonMatch[0]);
  return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
};

export const isConfigured = () => !!API_KEY;
