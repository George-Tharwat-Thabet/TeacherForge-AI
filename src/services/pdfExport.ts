import { jsPDF } from 'jspdf';
import type { Lesson, Exam } from '../types';

// Helper to clean markdown text
const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[\-\*]\s/gm, '• ')
    .trim();
};

// Colors
const COLORS = {
  primary: [124, 58, 237] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [229, 231, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
};

// ============ LESSON PDF EXPORT ============

export const exportLessonToPDF = (lesson: Lesson) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  const drawHeader = () => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(lesson.title), margin, 25);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${lesson.subject}  •  ${lesson.grade}`, margin, 37);
    y = 55;
  };

  const drawSectionTitle = (title: string, icon: string) => {
    addNewPageIfNeeded(20);
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon}  ${title}`, margin + 5, y + 8);
    y += 18;
  };

  drawHeader();
  drawSectionTitle('Explanation', '📖');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const explanationLines = doc.splitTextToSize(cleanText(lesson.explanation), contentWidth);
  for (const line of explanationLines) { addNewPageIfNeeded(7); doc.text(line, margin, y); y += 6; }
  y += 10;

  drawSectionTitle('Slides', '🎯');
  lesson.slides.forEach((slide, index) => {
    addNewPageIfNeeded(40);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin + 5, y + 5, 20, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Slide ${index + 1}`, margin + 7, y + 10.5);
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(12);
    doc.text(cleanText(slide.title), margin + 30, y + 11);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contentLines = doc.splitTextToSize(cleanText(slide.content), contentWidth - 15).slice(0, 3);
    contentLines.forEach((line: string, lineIndex: number) => { doc.text(line, margin + 7, y + 20 + lineIndex * 5); });
    y += 40;
  });
  y += 10;

  addNewPageIfNeeded(30);
  drawSectionTitle('Quiz Questions', '❓');
  lesson.quiz.forEach((question, index) => {
    const questionHeight = question.options ? 45 + question.options.length * 8 : 30;
    addNewPageIfNeeded(questionHeight);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, 12, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, margin + 4, y + 5.5);
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(pageWidth - margin - 20, y, 20, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.text(`${question.points} pts`, pageWidth - margin - 18, y + 5.5);
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const questionLines = doc.splitTextToSize(cleanText(question.question), contentWidth - 45);
    questionLines.forEach((line: string, lineIndex: number) => { doc.text(line, margin + 16, y + 5.5 + lineIndex * 5); });
    y += 12 + (questionLines.length - 1) * 5;
    if (question.options && question.options.length > 0) {
      question.options.forEach((option, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const isCorrect = option === question.correctAnswer;
        if (isCorrect) { doc.setFillColor(220, 252, 231); doc.roundedRect(margin + 10, y - 1, contentWidth - 15, 7, 1, 1, 'F'); }
        doc.setTextColor(isCorrect ? COLORS.green[0] : COLORS.gray[0], isCorrect ? COLORS.green[1] : COLORS.gray[1], isCorrect ? COLORS.green[2] : COLORS.gray[2]);
        doc.setFontSize(10);
        doc.text(`${letter}. ${cleanText(option)}`, margin + 12, y + 4);
        y += 7;
      });
    }
    y += 8;
  });
  y += 10;

  addNewPageIfNeeded(30);
  drawSectionTitle('Homework', '📝');
  lesson.homework.forEach((task, index) => {
    addNewPageIfNeeded(15);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, 10, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, margin + 3, y + 5.5);
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const taskLines = doc.splitTextToSize(cleanText(task), contentWidth - 20);
    taskLines.forEach((line: string, lineIndex: number) => { doc.text(line, margin + 15, y + 5.5 + lineIndex * 5); });
    y += 12 + (taskLines.length - 1) * 5;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  doc.save(`${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}_Lesson.pdf`);
};

export const exportLessonToPDFBW = (lesson: Lesson) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const BLACK: [number, number, number] = [0, 0, 0];
  const DARK_GRAY: [number, number, number] = [60, 60, 60];
  const MEDIUM_GRAY: [number, number, number] = [120, 120, 120];
  const LIGHT_GRAY: [number, number, number] = [200, 200, 200];
  const WHITE: [number, number, number] = [255, 255, 255];

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(lesson.title), margin, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${lesson.subject}  •  ${lesson.grade}`, margin, 33);
  y = 50;

  const drawSectionTitle = (title: string) => {
    addNewPageIfNeeded(15);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setTextColor(...BLACK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin, y + 10);
    y += 18;
  };

  drawSectionTitle('Explanation');
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const explanationLines = doc.splitTextToSize(cleanText(lesson.explanation), contentWidth);
  for (const line of explanationLines) { addNewPageIfNeeded(7); doc.text(line, margin, y); y += 6; }
  y += 10;

  drawSectionTitle('Slides');
  lesson.slides.forEach((slide, index) => {
    addNewPageIfNeeded(25);
    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${cleanText(slide.title)}`, margin, y);
    y += 6;
    doc.setTextColor(...DARK_GRAY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cleanText(slide.content), contentWidth - 5).slice(0, 4);
    lines.forEach((line: string) => { doc.text(line, margin + 5, y); y += 5; });
    y += 5;
  });
  y += 5;

  drawSectionTitle('Quiz');
  lesson.quiz.forEach((q, index) => {
    const height = q.options ? 20 + q.options.length * 6 : 15;
    addNewPageIfNeeded(height);
    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${cleanText(q.question)}`, margin, y);
    y += 6;
    if (q.options) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      q.options.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = opt === q.correctAnswer;
        doc.setTextColor(isCorrect ? 0 : MEDIUM_GRAY[0], isCorrect ? 0 : MEDIUM_GRAY[1], isCorrect ? 0 : MEDIUM_GRAY[2]);
        doc.text(`${letter}. ${cleanText(opt)}${isCorrect ? ' ✓' : ''}`, margin + 8, y);
        y += 5;
      });
    }
    y += 5;
  });
  y += 5;

  drawSectionTitle('Homework');
  lesson.homework.forEach((task, index) => {
    addNewPageIfNeeded(12);
    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`${index + 1}. ${cleanText(task)}`, contentWidth);
    lines.forEach((line: string) => { doc.text(line, margin, y); y += 5; });
    y += 3;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...MEDIUM_GRAY);
    doc.setFontSize(9);
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  doc.save(`${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}_Lesson_BW.pdf`);
};


// ============ EXAM PDF EXPORT ============

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'mcq': 'Multiple Choice',
    'essay': 'Essay',
    'matching': 'Matching',
    'true-false': 'True/False',
    'fill-blank': 'Fill in the Blank'
  };
  return labels[type] || type;
};

// Export exam as TWO separate PDF files: Questions and Answer Key
export const exportExamToPDF = (exam: Exam) => {
  const fileBase = exam.title.replace(/[^a-zA-Z0-9]/g, '_');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ========== QUESTIONS PDF ==========
  const qDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = margin;

  const addPageQ = (space: number) => {
    if (y + space > pageHeight - margin) { qDoc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  qDoc.setFillColor(...COLORS.primary);
  qDoc.rect(0, 0, pageWidth, 50, 'F');
  qDoc.setTextColor(...COLORS.white);
  qDoc.setFontSize(22);
  qDoc.setFont('helvetica', 'bold');
  qDoc.text(cleanText(exam.title), margin, 22);
  qDoc.setFontSize(11);
  qDoc.setFont('helvetica', 'normal');
  qDoc.text(`${exam.subject}  •  ${exam.grade}`, margin, 33);
  qDoc.setFontSize(10);
  qDoc.text(`⏱ ${exam.duration} minutes  •  📊 ${exam.totalPoints} points`, margin, 43);
  y = 60;

  // Student info
  qDoc.setFillColor(250, 250, 250);
  qDoc.setDrawColor(...COLORS.lightGray);
  qDoc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'FD');
  qDoc.setTextColor(...COLORS.dark);
  qDoc.setFontSize(11);
  qDoc.text('Student Name: _______________________________', margin + 5, y + 8);
  qDoc.text('Date: _______________', margin + 5, y + 16);
  qDoc.text('Score: _____ / ' + exam.totalPoints, pageWidth - margin - 40, y + 12);
  y += 30;

  // Instructions
  qDoc.setFillColor(...COLORS.lightGray);
  qDoc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  qDoc.setTextColor(...COLORS.primary);
  qDoc.setFontSize(12);
  qDoc.setFont('helvetica', 'bold');
  qDoc.text('📋  Instructions', margin + 5, y + 8);
  y += 16;
  qDoc.setTextColor(...COLORS.gray);
  qDoc.setFontSize(10);
  qDoc.setFont('helvetica', 'normal');
  qDoc.text('• Read each question carefully before answering.', margin + 5, y);
  y += 5;
  qDoc.text('• Write your answers clearly in the space provided.', margin + 5, y);
  y += 5;
  qDoc.text('• Show all work where applicable.', margin + 5, y);
  y += 12;

  // Group questions by type
  const questionsByType: Record<string, typeof exam.questions> = {};
  exam.questions.forEach(q => {
    if (!questionsByType[q.type]) questionsByType[q.type] = [];
    questionsByType[q.type].push(q);
  });

  let qNum = 1;
  Object.entries(questionsByType).forEach(([type, questions]) => {
    addPageQ(25);
    qDoc.setFillColor(240, 240, 255);
    qDoc.setDrawColor(...COLORS.primary);
    qDoc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
    qDoc.setTextColor(...COLORS.primary);
    qDoc.setFontSize(11);
    qDoc.setFont('helvetica', 'bold');
    qDoc.text(`${getTypeLabel(type)} (${questions.length} questions)`, margin + 5, y + 7);
    y += 15;

    questions.forEach((q) => {
      const qHeight = q.options && q.options.length > 0 ? 25 + q.options.length * 8 : 35;
      addPageQ(qHeight);

      qDoc.setFillColor(...COLORS.primary);
      qDoc.roundedRect(margin, y, 12, 8, 2, 2, 'F');
      qDoc.setTextColor(...COLORS.white);
      qDoc.setFontSize(10);
      qDoc.setFont('helvetica', 'bold');
      qDoc.text(`${qNum}`, margin + 4, y + 5.5);

      qDoc.setFillColor(...COLORS.lightGray);
      qDoc.roundedRect(pageWidth - margin - 20, y, 20, 8, 2, 2, 'F');
      qDoc.setTextColor(...COLORS.gray);
      qDoc.setFontSize(9);
      qDoc.text(`${q.points} pts`, pageWidth - margin - 18, y + 5.5);

      qDoc.setTextColor(...COLORS.dark);
      qDoc.setFontSize(11);
      qDoc.setFont('helvetica', 'normal');
      const qLines = qDoc.splitTextToSize(cleanText(q.question), contentWidth - 45);
      qLines.forEach((line: string, idx: number) => { qDoc.text(line, margin + 16, y + 5.5 + idx * 5); });
      y += 12 + (qLines.length - 1) * 5;

      if (q.options && q.options.length > 0 && (type === 'mcq' || type === 'matching')) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          qDoc.setFillColor(250, 250, 250);
          qDoc.roundedRect(margin + 10, y - 1, contentWidth - 15, 7, 1, 1, 'F');
          qDoc.setTextColor(...COLORS.dark);
          qDoc.setFontSize(10);
          qDoc.text(`${letter}. ${cleanText(opt)}`, margin + 12, y + 4);
          y += 8;
        });
      }

      if (type === 'essay') {
        qDoc.setDrawColor(...COLORS.lightGray);
        for (let i = 0; i < 3; i++) { qDoc.line(margin + 10, y + 5 + i * 8, pageWidth - margin, y + 5 + i * 8); }
        y += 30;
      } else if (type === 'fill-blank') {
        y += 5;
      } else if (type === 'true-false') {
        qDoc.setTextColor(...COLORS.gray);
        qDoc.setFontSize(10);
        qDoc.text('○ True    ○ False', margin + 16, y);
        y += 8;
      }
      y += 8;
      qNum++;
    });
    y += 5;
  });

  // Footer for questions PDF
  const totalQPages = qDoc.getNumberOfPages();
  for (let i = 1; i <= totalQPages; i++) {
    qDoc.setPage(i);
    qDoc.setDrawColor(...COLORS.lightGray);
    qDoc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    qDoc.setTextColor(...COLORS.gray);
    qDoc.setFontSize(9);
    qDoc.setFont('helvetica', 'normal');
    qDoc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    qDoc.text(`Page ${i} of ${totalQPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  qDoc.save(`${fileBase}_Questions.pdf`);

  // ========== ANSWER KEY PDF ==========
  const aDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  y = margin;

  const addPageA = (space: number) => {
    if (y + space > pageHeight - margin) { aDoc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  aDoc.setFillColor(...COLORS.green);
  aDoc.rect(0, 0, pageWidth, 50, 'F');
  aDoc.setTextColor(...COLORS.white);
  aDoc.setFontSize(22);
  aDoc.setFont('helvetica', 'bold');
  aDoc.text('Answer Key', margin, 22);
  aDoc.setFontSize(12);
  aDoc.setFont('helvetica', 'normal');
  aDoc.text(cleanText(exam.title), margin, 34);
  aDoc.setFontSize(10);
  aDoc.text(`${exam.subject}  •  ${exam.grade}  •  ${exam.totalPoints} points`, margin, 44);
  y = 60;

  // Group answers by type
  const answersByType: Record<string, { idx: number; q: typeof exam.questions[0] }[]> = {};
  exam.questions.forEach((q, idx) => {
    if (!answersByType[q.type]) answersByType[q.type] = [];
    answersByType[q.type].push({ idx: idx + 1, q });
  });

  Object.entries(answersByType).forEach(([type, items]) => {
    addPageA(25);
    aDoc.setFillColor(220, 252, 231);
    aDoc.setDrawColor(...COLORS.green);
    aDoc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
    aDoc.setTextColor(22, 163, 74);
    aDoc.setFontSize(11);
    aDoc.setFont('helvetica', 'bold');
    aDoc.text(`${getTypeLabel(type)} (${items.length} questions)`, margin + 5, y + 7);
    y += 15;

    if (type === 'mcq' || type === 'true-false') {
      // Compact grid format
      const cols = 5;
      const colWidth = contentWidth / cols;
      const startY = y;

      items.forEach(({ idx, q }, itemIdx) => {
        const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer);
        const col = itemIdx % cols;
        const row = Math.floor(itemIdx / cols);
        const xPos = margin + col * colWidth;
        const actualY = startY + row * 12;

        aDoc.setFillColor(...COLORS.primary);
        aDoc.roundedRect(xPos, actualY, 8, 7, 1, 1, 'F');
        aDoc.setTextColor(...COLORS.white);
        aDoc.setFontSize(8);
        aDoc.setFont('helvetica', 'bold');
        aDoc.text(`${idx}`, xPos + 2.5, actualY + 5);

        aDoc.setTextColor(...COLORS.dark);
        aDoc.setFontSize(10);
        aDoc.setFont('helvetica', 'normal');
        aDoc.text(cleanText(answer).substring(0, 12), xPos + 11, actualY + 5);
      });
      y = startY + Math.ceil(items.length / cols) * 12 + 8;
    } else {
      // Full answer cards
      items.forEach(({ idx, q }) => {
        const answer = Array.isArray(q.correctAnswer) 
          ? q.correctAnswer.join(', ') 
          : typeof q.correctAnswer === 'object' && q.correctAnswer !== null
            ? Object.values(q.correctAnswer).join(', ')
            : String(q.correctAnswer);

        addPageA(20);
        aDoc.setFillColor(250, 250, 250);
        aDoc.setDrawColor(...COLORS.lightGray);
        const answerText = cleanText(answer);
        const answerLines = aDoc.splitTextToSize(answerText, contentWidth - 25);
        const cardHeight = Math.max(14, 8 + answerLines.length * 5);
        aDoc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

        aDoc.setFillColor(...COLORS.primary);
        aDoc.roundedRect(margin + 3, y + 3, 10, 7, 2, 2, 'F');
        aDoc.setTextColor(...COLORS.white);
        aDoc.setFontSize(9);
        aDoc.setFont('helvetica', 'bold');
        aDoc.text(`${idx}`, margin + 6, y + 8);

        aDoc.setTextColor(...COLORS.dark);
        aDoc.setFontSize(10);
        aDoc.setFont('helvetica', 'normal');
        answerLines.forEach((line: string, lineIdx: number) => { aDoc.text(line, margin + 18, y + 8 + lineIdx * 5); });
        y += cardHeight + 4;
      });
    }
    y += 8;
  });

  // Footer for answer key PDF
  const totalAPages = aDoc.getNumberOfPages();
  for (let i = 1; i <= totalAPages; i++) {
    aDoc.setPage(i);
    aDoc.setDrawColor(...COLORS.lightGray);
    aDoc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    aDoc.setTextColor(...COLORS.gray);
    aDoc.setFontSize(9);
    aDoc.setFont('helvetica', 'normal');
    aDoc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    aDoc.text(`Page ${i} of ${totalAPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  aDoc.save(`${fileBase}_AnswerKey.pdf`);
};


// Black and white version - TWO separate PDF files
export const exportExamToPDFBW = (exam: Exam) => {
  const fileBase = exam.title.replace(/[^a-zA-Z0-9]/g, '_');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const BLACK: [number, number, number] = [0, 0, 0];
  const DARK_GRAY: [number, number, number] = [60, 60, 60];
  const MEDIUM_GRAY: [number, number, number] = [120, 120, 120];
  const LIGHT_GRAY: [number, number, number] = [200, 200, 200];
  const WHITE: [number, number, number] = [255, 255, 255];

  // ========== QUESTIONS PDF (B&W) ==========
  const qDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = margin;

  const addPageQ = (space: number) => {
    if (y + space > pageHeight - margin) { qDoc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  qDoc.setFillColor(...BLACK);
  qDoc.rect(0, 0, pageWidth, 45, 'F');
  qDoc.setTextColor(...WHITE);
  qDoc.setFontSize(20);
  qDoc.setFont('helvetica', 'bold');
  qDoc.text(cleanText(exam.title), margin, 20);
  qDoc.setFontSize(11);
  qDoc.setFont('helvetica', 'normal');
  qDoc.text(`${exam.subject}  •  ${exam.grade}`, margin, 30);
  qDoc.setFontSize(10);
  qDoc.text(`Duration: ${exam.duration} min  •  Total: ${exam.totalPoints} points`, margin, 39);
  y = 55;

  // Student info
  qDoc.setDrawColor(...BLACK);
  qDoc.setLineWidth(0.5);
  qDoc.rect(margin, y, contentWidth, 18);
  qDoc.setTextColor(...BLACK);
  qDoc.setFontSize(10);
  qDoc.text('Name: _________________________________', margin + 5, y + 7);
  qDoc.text('Date: _______________', margin + 5, y + 14);
  qDoc.text('Score: _____ / ' + exam.totalPoints, pageWidth - margin - 35, y + 10);
  y += 25;

  // Instructions
  qDoc.setDrawColor(...BLACK);
  qDoc.line(margin, y, pageWidth - margin, y);
  qDoc.setTextColor(...BLACK);
  qDoc.setFontSize(11);
  qDoc.setFont('helvetica', 'bold');
  qDoc.text('INSTRUCTIONS', margin, y + 8);
  y += 12;
  qDoc.setFont('helvetica', 'normal');
  qDoc.setFontSize(9);
  qDoc.text('Read each question carefully. Write answers clearly. Show all work.', margin, y);
  y += 10;

  // Group questions by type
  const questionsByType: Record<string, typeof exam.questions> = {};
  exam.questions.forEach(q => {
    if (!questionsByType[q.type]) questionsByType[q.type] = [];
    questionsByType[q.type].push(q);
  });

  let qNum = 1;
  Object.entries(questionsByType).forEach(([type, questions]) => {
    addPageQ(20);
    qDoc.setDrawColor(...BLACK);
    qDoc.line(margin, y, pageWidth - margin, y);
    qDoc.setTextColor(...BLACK);
    qDoc.setFontSize(11);
    qDoc.setFont('helvetica', 'bold');
    qDoc.text(`${getTypeLabel(type).toUpperCase()} (${questions.length})`, margin, y + 8);
    y += 14;

    questions.forEach((q) => {
      const qHeight = q.options && q.options.length > 0 ? 20 + q.options.length * 6 : 30;
      addPageQ(qHeight);

      qDoc.setTextColor(...BLACK);
      qDoc.setFontSize(10);
      qDoc.setFont('helvetica', 'bold');
      qDoc.text(`${qNum}.`, margin, y);
      qDoc.setFont('helvetica', 'normal');
      const qLines = qDoc.splitTextToSize(cleanText(q.question), contentWidth - 15);
      qLines.forEach((line: string, idx: number) => { qDoc.text(line, margin + 8, y + idx * 5); });
      qDoc.setTextColor(...MEDIUM_GRAY);
      qDoc.setFontSize(8);
      qDoc.text(`(${q.points} pts)`, pageWidth - margin - 15, y);
      y += 6 + (qLines.length - 1) * 5;

      if (q.options && q.options.length > 0 && (type === 'mcq' || type === 'matching')) {
        qDoc.setTextColor(...DARK_GRAY);
        qDoc.setFontSize(9);
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          qDoc.text(`${letter}. ${cleanText(opt)}`, margin + 10, y);
          y += 5;
        });
      }

      if (type === 'essay') {
        qDoc.setDrawColor(...LIGHT_GRAY);
        for (let i = 0; i < 3; i++) { qDoc.line(margin + 8, y + 3 + i * 7, pageWidth - margin, y + 3 + i * 7); }
        y += 25;
      } else if (type === 'true-false') {
        qDoc.setTextColor(...DARK_GRAY);
        qDoc.setFontSize(9);
        qDoc.text('[ ] True    [ ] False', margin + 10, y);
        y += 6;
      }
      y += 6;
      qNum++;
    });
    y += 3;
  });

  // Footer
  const totalQPages = qDoc.getNumberOfPages();
  for (let i = 1; i <= totalQPages; i++) {
    qDoc.setPage(i);
    qDoc.setDrawColor(...LIGHT_GRAY);
    qDoc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    qDoc.setTextColor(...MEDIUM_GRAY);
    qDoc.setFontSize(9);
    qDoc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    qDoc.text(`Page ${i} of ${totalQPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  qDoc.save(`${fileBase}_Questions_BW.pdf`);

  // ========== ANSWER KEY PDF (B&W) ==========
  const aDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  y = margin;

  const addPageA = (space: number) => {
    if (y + space > pageHeight - margin) { aDoc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  aDoc.setFillColor(...BLACK);
  aDoc.rect(0, 0, pageWidth, 40, 'F');
  aDoc.setTextColor(...WHITE);
  aDoc.setFontSize(18);
  aDoc.setFont('helvetica', 'bold');
  aDoc.text('ANSWER KEY', margin, 18);
  aDoc.setFontSize(10);
  aDoc.setFont('helvetica', 'normal');
  aDoc.text(cleanText(exam.title), margin, 28);
  aDoc.setFontSize(9);
  aDoc.text(`${exam.subject}  •  ${exam.grade}  •  ${exam.totalPoints} points`, margin, 36);
  y = 50;

  // Group answers by type
  const answersByType: Record<string, { idx: number; q: typeof exam.questions[0] }[]> = {};
  exam.questions.forEach((q, idx) => {
    if (!answersByType[q.type]) answersByType[q.type] = [];
    answersByType[q.type].push({ idx: idx + 1, q });
  });

  Object.entries(answersByType).forEach(([type, items]) => {
    addPageA(20);
    aDoc.setDrawColor(...BLACK);
    aDoc.setLineWidth(0.5);
    aDoc.line(margin, y, pageWidth - margin, y);
    aDoc.setTextColor(...BLACK);
    aDoc.setFontSize(11);
    aDoc.setFont('helvetica', 'bold');
    aDoc.text(`${getTypeLabel(type).toUpperCase()} (${items.length})`, margin, y + 8);
    y += 14;

    if (type === 'mcq' || type === 'true-false') {
      // Compact grid
      const cols = 5;
      const colWidth = contentWidth / cols;
      items.forEach(({ idx, q }, itemIdx) => {
        const col = itemIdx % cols;
        const row = Math.floor(itemIdx / cols);
        if (col === 0 && row > 0) y += 10;
        if (col === 0) addPageA(10);
        const xPos = margin + col * colWidth;
        const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer);
        aDoc.setTextColor(...BLACK);
        aDoc.setFontSize(10);
        aDoc.setFont('helvetica', 'bold');
        aDoc.text(`${idx}.`, xPos, y);
        aDoc.setFont('helvetica', 'normal');
        aDoc.text(cleanText(answer).substring(0, 12), xPos + 8, y);
      });
      y += 15;
    } else {
      // Full answers with boxes
      items.forEach(({ idx, q }) => {
        const answer = Array.isArray(q.correctAnswer) 
          ? q.correctAnswer.join(', ') 
          : typeof q.correctAnswer === 'object' && q.correctAnswer !== null
            ? Object.values(q.correctAnswer).join(', ')
            : String(q.correctAnswer);
        addPageA(15);
        const answerText = cleanText(answer);
        const answerLines = aDoc.splitTextToSize(answerText, contentWidth - 20);
        const boxHeight = Math.max(10, 6 + answerLines.length * 5);
        aDoc.setDrawColor(...LIGHT_GRAY);
        aDoc.setLineWidth(0.3);
        aDoc.rect(margin, y, contentWidth, boxHeight);
        aDoc.setTextColor(...BLACK);
        aDoc.setFontSize(10);
        aDoc.setFont('helvetica', 'bold');
        aDoc.text(`${idx}.`, margin + 3, y + 6);
        aDoc.setFont('helvetica', 'normal');
        answerLines.forEach((line: string, lineIdx: number) => { aDoc.text(line, margin + 12, y + 6 + lineIdx * 5); });
        y += boxHeight + 3;
      });
    }
    y += 5;
  });

  // Footer
  const totalAPages = aDoc.getNumberOfPages();
  for (let i = 1; i <= totalAPages; i++) {
    aDoc.setPage(i);
    aDoc.setDrawColor(...LIGHT_GRAY);
    aDoc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    aDoc.setTextColor(...MEDIUM_GRAY);
    aDoc.setFontSize(9);
    aDoc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    aDoc.text(`Page ${i} of ${totalAPages}`, pageWidth - margin - 20, pageHeight - 8);
  }
  aDoc.save(`${fileBase}_AnswerKey_BW.pdf`);
};


// ============ LESSON REMIX PDF EXPORT ============

export const exportRemixToPDF = (remix: import('../types').RemixedLesson) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(remix.newTitle), margin, 24);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Remixed Lesson', margin, 36);
  if (remix.originalTitle) {
    doc.setFontSize(10);
    doc.text(`Original: ${cleanText(remix.originalTitle)}`, margin, 45);
  }
  y = 60;

  const drawSectionTitle = (title: string, icon: string, color: [number, number, number]) => {
    addNewPageIfNeeded(20);
    doc.setFillColor(color[0], color[1], color[2], 0.1);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon}  ${title}`, margin + 5, y + 8);
    y += 18;
  };

  // New Examples Section
  drawSectionTitle('New Examples', '💡', [139, 92, 246]);
  remix.newExamples.forEach((example) => {
    addNewPageIfNeeded(15);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('•', margin + 5, y + 8);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cleanText(example), contentWidth - 20);
    lines.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0) doc.text(line, margin + 12, y + 8);
      else { y += 5; doc.text(line, margin + 12, y + 8); }
    });
    y += 15;
  });
  y += 5;

  // New Activities Section
  drawSectionTitle('New Activities', '🎮', [34, 197, 94]);
  remix.newActivities.forEach((activity, index) => {
    addNewPageIfNeeded(15);
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin + 5, y + 8);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cleanText(activity), contentWidth - 20);
    lines.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0) doc.text(line, margin + 14, y + 8);
      else { y += 5; doc.text(line, margin + 14, y + 8); }
    });
    y += 15;
  });
  y += 5;

  // Engagement Tricks Section
  drawSectionTitle('Engagement Tricks', '✨', [245, 158, 11]);
  remix.engagementTricks.forEach((trick) => {
    addNewPageIfNeeded(15);
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(217, 119, 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✨', margin + 5, y + 8);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cleanText(trick), contentWidth - 20);
    lines.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0) doc.text(line, margin + 14, y + 8);
      else { y += 5; doc.text(line, margin + 14, y + 8); }
    });
    y += 15;
  });
  y += 10;

  // Full Content Section
  addNewPageIfNeeded(30);
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('📄  Full Remixed Lesson', margin + 5, y + 8);
  y += 18;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const contentLines = remix.fullContent.split('\n');
  contentLines.forEach((line) => {
    if (!line.trim()) { y += 4; return; }
    addNewPageIfNeeded(8);
    
    const cleanLine = cleanText(line);
    if (line.startsWith('# ')) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(cleanLine, margin, y);
      y += 8;
    } else if (line.startsWith('## ')) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(cleanLine, margin, y);
      y += 7;
    } else if (line.startsWith('### ')) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.gray);
      doc.text(cleanLine, margin, y);
      y += 6;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      wrapped.forEach((wLine: string) => {
        addNewPageIfNeeded(6);
        doc.text(wLine, margin, y);
        y += 5;
      });
    }
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }

  doc.save(`${remix.newTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Remixed.pdf`);
};

export const exportRemixToPDFBW = (remix: import('../types').RemixedLesson) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const BLACK: [number, number, number] = [0, 0, 0];
  const DARK_GRAY: [number, number, number] = [60, 60, 60];
  const MEDIUM_GRAY: [number, number, number] = [120, 120, 120];
  const LIGHT_GRAY: [number, number, number] = [200, 200, 200];
  const WHITE: [number, number, number] = [255, 255, 255];

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(remix.newTitle), margin, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Remixed Lesson', margin, 33);
  if (remix.originalTitle) {
    doc.setFontSize(9);
    doc.text(`Original: ${cleanText(remix.originalTitle)}`, margin, 41);
  }
  y = 55;

  const drawSectionTitle = (title: string) => {
    addNewPageIfNeeded(15);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setTextColor(...BLACK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin, y + 10);
    y += 16;
  };

  // New Examples
  drawSectionTitle('New Examples');
  remix.newExamples.forEach((example) => {
    addNewPageIfNeeded(12);
    doc.setTextColor(...BLACK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`• ${cleanText(example)}`, contentWidth - 5);
    lines.forEach((line: string) => { doc.text(line, margin + 5, y); y += 5; });
    y += 3;
  });
  y += 5;

  // New Activities
  drawSectionTitle('New Activities');
  remix.newActivities.forEach((activity, index) => {
    addNewPageIfNeeded(12);
    doc.setTextColor(...BLACK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`${index + 1}. ${cleanText(activity)}`, contentWidth - 5);
    lines.forEach((line: string) => { doc.text(line, margin + 5, y); y += 5; });
    y += 3;
  });
  y += 5;

  // Engagement Tricks
  drawSectionTitle('Engagement Tricks');
  remix.engagementTricks.forEach((trick) => {
    addNewPageIfNeeded(12);
    doc.setTextColor(...BLACK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`★ ${cleanText(trick)}`, contentWidth - 5);
    lines.forEach((line: string) => { doc.text(line, margin + 5, y); y += 5; });
    y += 3;
  });
  y += 5;

  // Full Content
  drawSectionTitle('Full Remixed Lesson');
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const contentLines = remix.fullContent.split('\n');
  contentLines.forEach((line) => {
    if (!line.trim()) { y += 3; return; }
    addNewPageIfNeeded(7);
    const cleanLine = cleanText(line);
    if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
      doc.setFont('helvetica', 'bold');
      doc.text(cleanLine, margin, y);
      doc.setFont('helvetica', 'normal');
    } else {
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      wrapped.forEach((wLine: string) => { addNewPageIfNeeded(5); doc.text(wLine, margin, y); y += 5; });
      return;
    }
    y += 6;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...MEDIUM_GRAY);
    doc.setFontSize(9);
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }

  doc.save(`${remix.newTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Remixed_BW.pdf`);
};


// ============ GRADING RESULTS PDF EXPORT ============

interface GradedPaper {
  studentName: string;
  score: number;
  feedback: string;
  detailedResults?: { question: string; answer: string; correct: boolean; points: number }[];
}

export const exportGradingResultsToPDF = (results: GradedPaper[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const passCount = results.filter(r => r.score >= 70).length;
  const failCount = results.length - passCount;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Grading Results', margin, 24);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${results.length} Papers Graded`, margin, 36);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 45);
  y = 60;

  // Summary Stats
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...COLORS.lightGray);
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'FD');
  
  const statWidth = contentWidth / 3;
  
  // Average Score
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${avgScore}%`, margin + statWidth / 2, y + 12, { align: 'center' });
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Average Score', margin + statWidth / 2, y + 20, { align: 'center' });
  
  // Pass Count
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${passCount}`, margin + statWidth + statWidth / 2, y + 12, { align: 'center' });
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Passed (≥70%)', margin + statWidth + statWidth / 2, y + 20, { align: 'center' });
  
  // Fail Count
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${failCount}`, margin + statWidth * 2 + statWidth / 2, y + 12, { align: 'center' });
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Below 70%', margin + statWidth * 2 + statWidth / 2, y + 20, { align: 'center' });
  
  y += 35;

  // Section Title
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('📋  Individual Results', margin + 5, y + 8);
  y += 18;

  // Individual Results
  results.forEach((paper) => {
    const hasDetails = paper.detailedResults && paper.detailedResults.length > 0;
    const cardHeight = hasDetails ? 45 + paper.detailedResults!.length * 8 : 45;
    addNewPageIfNeeded(cardHeight);

    // Card background
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');

    // Student avatar circle
    doc.setFillColor(...COLORS.primary);
    doc.circle(margin + 12, y + 12, 8, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(paper.studentName.charAt(0).toUpperCase(), margin + 12, y + 15, { align: 'center' });

    // Student name
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(paper.studentName, margin + 25, y + 14);

    // Score badge
    const scoreColor = paper.score >= 70 ? [34, 197, 94] : [239, 68, 68];
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2], 0.1);
    doc.roundedRect(pageWidth - margin - 30, y + 5, 25, 14, 3, 3, 'F');
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${paper.score}%`, pageWidth - margin - 17.5, y + 14, { align: 'center' });

    // Feedback
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const feedbackLines = doc.splitTextToSize(cleanText(paper.feedback), contentWidth - 20);
    feedbackLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, margin + 8, y + 26 + idx * 5);
    });

    // Detailed results if available
    if (hasDetails) {
      let detailY = y + 40;
      paper.detailedResults!.forEach((result) => {
        // Use light background colors (proper RGB without alpha)
        const bgColor: [number, number, number] = result.correct ? [220, 252, 231] : [254, 226, 226];
        const textColor: [number, number, number] = result.correct ? [22, 163, 74] : [220, 38, 38];
        doc.setFillColor(...bgColor);
        doc.roundedRect(margin + 5, detailY, contentWidth - 10, 7, 1, 1, 'F');
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.text(result.correct ? '✓' : '✗', margin + 8, detailY + 5);
        doc.setTextColor(...COLORS.dark);
        doc.text(cleanText(result.question).substring(0, 50), margin + 15, detailY + 5);
        doc.setTextColor(...COLORS.gray);
        doc.text(`${result.points} pts`, pageWidth - margin - 15, detailY + 5);
        detailY += 8;
      });
    }

    y += cardHeight + 8;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }

  const fileName = results.length === 1 
    ? `${results[0].studentName.replace(/[^a-zA-Z0-9]/g, '_')}_GradingResult.pdf`
    : `Grading_Results_${results.length}_Students.pdf`;
  doc.save(fileName);
};

export const exportGradingResultsToPDFBW = (results: GradedPaper[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const BLACK: [number, number, number] = [0, 0, 0];
  const DARK_GRAY: [number, number, number] = [60, 60, 60];
  const MEDIUM_GRAY: [number, number, number] = [120, 120, 120];
  const LIGHT_GRAY: [number, number, number] = [200, 200, 200];
  const WHITE: [number, number, number] = [255, 255, 255];

  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const passCount = results.filter(r => r.score >= 70).length;
  const failCount = results.length - passCount;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; return true; }
    return false;
  };

  // Header
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GRADING RESULTS', margin, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${results.length} Papers Graded`, margin, 33);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 41);
  y = 55;

  // Summary Stats
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 20);
  
  const statWidth = contentWidth / 3;
  doc.line(margin + statWidth, y, margin + statWidth, y + 20);
  doc.line(margin + statWidth * 2, y, margin + statWidth * 2, y + 20);
  
  doc.setTextColor(...BLACK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${avgScore}%`, margin + statWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Average', margin + statWidth / 2, y + 16, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${passCount}`, margin + statWidth + statWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Passed', margin + statWidth + statWidth / 2, y + 16, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${failCount}`, margin + statWidth * 2 + statWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Below 70%', margin + statWidth * 2 + statWidth / 2, y + 16, { align: 'center' });
  
  y += 30;

  // Section Title
  doc.setDrawColor(...BLACK);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setTextColor(...BLACK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INDIVIDUAL RESULTS', margin, y + 10);
  y += 16;

  // Individual Results
  results.forEach((paper) => {
    const hasDetails = paper.detailedResults && paper.detailedResults.length > 0;
    const cardHeight = hasDetails ? 30 + paper.detailedResults!.length * 6 : 30;
    addNewPageIfNeeded(cardHeight);

    // Card border
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, cardHeight);

    // Student name and score
    doc.setTextColor(...BLACK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(paper.studentName, margin + 5, y + 8);
    
    const scoreText = `${paper.score}%${paper.score >= 70 ? ' ✓' : ''}`;
    doc.text(scoreText, pageWidth - margin - 5, y + 8, { align: 'right' });

    // Feedback
    doc.setTextColor(...DARK_GRAY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const feedbackLines = doc.splitTextToSize(cleanText(paper.feedback), contentWidth - 15);
    feedbackLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, margin + 5, y + 16 + idx * 4);
    });

    // Detailed results if available
    if (hasDetails) {
      let detailY = y + 26;
      paper.detailedResults!.forEach((result) => {
        doc.setTextColor(...BLACK);
        doc.setFontSize(8);
        doc.text(result.correct ? '✓' : '✗', margin + 5, detailY);
        doc.setTextColor(...MEDIUM_GRAY);
        doc.text(cleanText(result.question).substring(0, 55), margin + 12, detailY);
        doc.text(`${result.points}pts`, pageWidth - margin - 5, detailY, { align: 'right' });
        detailY += 6;
      });
    }

    y += cardHeight + 5;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...MEDIUM_GRAY);
    doc.setFontSize(9);
    doc.text('Generated by Teacherforge AI', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }

  const fileName = results.length === 1 
    ? `${results[0].studentName.replace(/[^a-zA-Z0-9]/g, '_')}_GradingResult_BW.pdf`
    : `Grading_Results_${results.length}_Students_BW.pdf`;
  doc.save(fileName);
};
