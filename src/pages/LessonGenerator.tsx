import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, BookOpen, Presentation, HelpCircle, ClipboardList, Download, X, FileText, ChevronDown } from 'lucide-react';
import { generateLessonFromImage, generateLessonFromMultipleFiles, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import { exportLessonToPDF, exportLessonToPDFBW } from '../services/pdfExport';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Lesson, HistoryItem } from '../types';

// Helper function to render markdown-style text
const renderMarkdown = (text: string) => {
  if (!text) return null;
  
  return text.split('\n').map((line, i) => {
    // Remove markdown symbols and render appropriately
    let content = line;
    let className = 'md-line';
    
    // Headers
    if (line.startsWith('### ')) {
      content = cleanMarkdownText(line.slice(4));
      className = 'md-h3';
    } else if (line.startsWith('## ')) {
      content = cleanMarkdownText(line.slice(3));
      className = 'md-h2';
    } else if (line.startsWith('# ')) {
      content = cleanMarkdownText(line.slice(2));
      className = 'md-h1';
    }
    // Bullet points (- or *)
    else if (/^[\-\*]\s/.test(line)) {
      content = cleanMarkdownText(line.slice(2));
      return <div key={i} className="md-bullet-item"><span className="md-bullet-dot">•</span><span>{content}</span></div>;
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        return <div key={i} className="md-numbered-item"><span className="md-number">{match[1]}.</span><span>{cleanMarkdownText(match[2])}</span></div>;
      }
    }
    // Empty line
    else if (!line.trim()) {
      return <div key={i} className="md-spacer" />;
    }
    // Regular text - clean it
    else {
      content = cleanMarkdownText(line);
    }
    
    return <div key={i} className={className}>{content}</div>;
  });
};

// Helper to clean and render text without markdown symbols
const cleanMarkdownText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove bold markers **text** -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic markers *text* -> text
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    // Remove remaining stray asterisks
    .replace(/\*/g, '')
    // Remove code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to render inline markdown (bold, italic) as styled elements
const renderInlineMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Simple approach: just clean the text and return it
  // This removes all markdown symbols
  return cleanMarkdownText(text);
};

interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'pdf';
}

export default function LessonGenerator() {
  const location = useLocation();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'explanation' | 'slides' | 'quiz' | 'homework'>('explanation');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'lesson') {
      setLoadedFromHistory(true);
      setLesson(state.historyItem.data as Lesson);
    }
  }, [location.state]);

  // Auto-save to history when lesson is generated (skip if loaded from history)
  useEffect(() => {
    if (lesson && !loadedFromHistory) {
      saveToHistory(
        'lesson',
        lesson.title,
        `${lesson.subject} - ${lesson.grade}`,
        lesson
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [lesson]);

  const handleFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      setError('Please upload an image or PDF file');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key in .env file (VITE_GEMINI_API_KEY)');
      return;
    }

    // For single file upload (drag & drop single file), process immediately
    if (uploadedFiles.length === 0) {
      setLoading(true);
      setError('');
      setLesson(null);

      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        const result = await generateLessonFromImage(base64, file.type);
        setLesson(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate lesson');
      } finally {
        setLoading(false);
      }
    }
  }, [uploadedFiles.length]);

  const handleMultipleFiles = async (files: FileList) => {
    const remainingSlots = 5 - uploadedFiles.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadedFiles(prev => [...prev, {
          file,
          preview: isImage ? URL.createObjectURL(file) : '',
          base64,
          mimeType: file.type,
          type: isImage ? 'image' : 'pdf'
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleGenerateFromFiles = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');
    setLesson(null);

    try {
      const files = uploadedFiles.map(f => ({
        base64: f.base64,
        mimeType: f.mimeType
      }));
      const result = await generateLessonFromMultipleFiles(files);
      setLesson(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length === 1 && uploadedFiles.length === 0) {
      handleFile(files[0]);
    } else {
      handleMultipleFiles(files);
    }
  }, [handleFile, uploadedFiles.length]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleMultipleFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);


  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <BookOpen size={28} />
        </div>
        <div>
          <h1>Lesson Generator</h1>
          <p>Upload textbook pages and get a complete lesson in seconds</p>
        </div>
      </header>

      <div className="card">
        <div
          className={`file-upload ${dragOver ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
          <motion.div
            className="upload-icon"
            animate={{ y: dragOver ? -10 : 0 }}
          >
            {dragOver ? <Image size={48} /> : <Upload size={48} />}
          </motion.div>
          <h3>Drop your textbook pages here</h3>
          <p>or click to browse • Supports JPG, PNG, WebP, PDF (up to 5 files)</p>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-section">
            <div className="file-previews">
              {uploadedFiles.map((f, index) => (
                <div key={index} className="file-preview">
                  {f.type === 'image' ? (
                    <img src={f.preview} alt={`Page ${index + 1}`} />
                  ) : (
                    <div className="pdf-preview">
                      <FileText size={32} />
                      <span>PDF</span>
                    </div>
                  )}
                  <button
                    className="remove-file"
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                  <div className="file-name">{f.file.name}</div>
                </div>
              ))}
              {uploadedFiles.length < 5 && (
                <div
                  className="add-more-files"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Image size={24} />
                  <span>Add more</span>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary generate-btn"
              onClick={(e) => { e.stopPropagation(); handleGenerateFromFiles(); }}
              disabled={loading}
            >
              Generate Lesson from {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSpinner message="Analyzing textbook and generating lesson..." />}

        {lesson && !loading && (
          <motion.div
            className="result-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="result-header">
              <div>
                <h2>{lesson.title}</h2>
                <div className="result-meta">
                  <span className="badge badge-primary">{lesson.subject}</span>
                  <span className="badge badge-success">{lesson.grade}</span>
                </div>
              </div>
              <div className="export-dropdown">
                <button className="btn btn-primary export-btn">
                  <Download size={18} />
                  Export PDF
                  <ChevronDown size={16} />
                </button>
                <div className="export-menu">
                  <button onClick={() => exportLessonToPDF(lesson)}>
                    <span className="export-icon">🎨</span>
                    <div>
                      <span className="export-title">Color Version</span>
                      <span className="export-desc">Full color, best for digital</span>
                    </div>
                  </button>
                  <button onClick={() => exportLessonToPDFBW(lesson)}>
                    <span className="export-icon">📄</span>
                    <div>
                      <span className="export-title">Black & White</span>
                      <span className="export-desc">Print-friendly, saves ink</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="tabs">
              {[
                { id: 'explanation', icon: BookOpen, label: 'Explanation' },
                { id: 'slides', icon: Presentation, label: `Slides (${lesson.slides.length})` },
                { id: 'quiz', icon: HelpCircle, label: `Quiz (${lesson.quiz.length})` },
                { id: 'homework', icon: ClipboardList, label: 'Homework' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'explanation' && (
                <div className="explanation-content">
                  {renderMarkdown(lesson.explanation)}
                </div>
              )}

              {activeTab === 'slides' && (
                <div className="slides-grid">
                  {lesson.slides.map((slide, i) => (
                    <motion.div
                      key={i}
                      className="slide-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="slide-number">Slide {i + 1}</div>
                      <h4>{slide.title?.replace(/^#+\s*/, '')}</h4>
                      <div className="slide-content">{renderMarkdown(slide.content)}</div>
                      {slide.notes && <div className="slide-notes">📝 {renderInlineMarkdown(slide.notes)}</div>}
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="quiz-list">
                  {lesson.quiz.map((q, i) => (
                    <motion.div
                      key={i}
                      className="quiz-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="quiz-header">
                        <span className="quiz-number">Q{i + 1}</span>
                        <span className="badge badge-primary">{q.points} pts</span>
                      </div>
                      <p className="quiz-question">{q.question}</p>
                      {q.options && (
                        <div className="quiz-options">
                          {q.options.map((opt, j) => (
                            <div key={j} className={`quiz-option ${opt === q.correctAnswer ? 'correct' : ''}`}>
                              {String.fromCharCode(65 + j)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'homework' && (
                <div className="homework-list">
                  {lesson.homework.map((task, i) => (
                    <motion.div
                      key={i}
                      className="homework-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span className="homework-number">{i + 1}</span>
                      <p>{task}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <style>{`
        .page { max-width: 1000px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .page-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white;
        }
        .page-header h1 { font-size: 28px; color: var(--gray-800); margin-bottom: 4px; }
        .page-header p { color: var(--gray-500); }

        .upload-icon { color: var(--primary); margin-bottom: 16px; }
        .file-upload h3 { color: var(--gray-700); margin-bottom: 8px; }
        .file-upload p { color: var(--gray-400); font-size: 14px; }

        .uploaded-files-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--gray-200); }
        .file-previews { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
        .file-preview { position: relative; width: 100px; display: flex; flex-direction: column; }
        .file-preview img { 
          width: 100px; height: 100px; object-fit: cover;
          border-radius: 10px; box-shadow: var(--shadow-sm);
        }
        .pdf-preview {
          width: 100px; height: 100px; background: var(--gray-100);
          border-radius: 10px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px;
          color: var(--gray-500); box-shadow: var(--shadow-sm);
        }
        .pdf-preview span { font-size: 12px; font-weight: 500; }
        .file-name {
          font-size: 11px; color: var(--gray-500); margin-top: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100px;
        }
        .remove-file {
          position: absolute; top: 4px; right: 4px;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(0,0,0,0.6); color: white; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .remove-file:hover { background: rgba(220,38,38,0.9); }
        .add-more-files {
          width: 100px; height: 100px; border: 2px dashed var(--gray-300);
          border-radius: 10px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px;
          cursor: pointer; transition: all 0.2s; color: var(--gray-400);
        }
        .add-more-files:hover { border-color: var(--primary); color: var(--primary); }
        .add-more-files span { font-size: 12px; }
        .generate-btn { width: 100%; padding: 14px; }

        .export-dropdown { position: relative; }
        .export-btn {
          display: flex; align-items: center; gap: 8px;
        }
        .export-menu {
          position: absolute; top: 100%; right: 0; margin-top: 8px;
          background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          min-width: 220px; overflow: hidden; z-index: 100;
          opacity: 0; visibility: hidden; transform: translateY(-10px);
          transition: all 0.2s ease;
        }
        .export-dropdown:hover .export-menu {
          opacity: 1; visibility: visible; transform: translateY(0);
        }
        .export-menu button {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 14px 16px; border: none; background: none;
          cursor: pointer; transition: background 0.2s; text-align: left;
        }
        .export-menu button:hover { background: var(--gray-50); }
        .export-menu button:first-child { border-bottom: 1px solid var(--gray-100); }
        .export-icon { font-size: 20px; }
        .export-title { display: block; font-weight: 600; color: var(--gray-800); font-size: 14px; }
        .export-desc { display: block; font-size: 12px; color: var(--gray-500); margin-top: 2px; }

        .error-message {
          margin-top: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626;
          border-radius: 12px; font-size: 14px;
        }

        .result-section { margin-top: 32px; }
        .result-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
        }
        .result-header h2 { font-size: 24px; color: var(--gray-800); margin-bottom: 8px; }
        .result-meta { display: flex; gap: 8px; }

        .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .tab {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
        }

        .tab-content {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: var(--shadow-md);
        }

        .explanation-content {
          line-height: 1.8; color: var(--gray-700);
        }

        /* Markdown styles */
        .md-line { margin-bottom: 8px; }
        .md-h1 { font-size: 20px; font-weight: 700; color: var(--gray-800); margin: 16px 0 12px; }
        .md-h2 { font-size: 17px; font-weight: 600; color: var(--gray-800); margin: 14px 0 10px; }
        .md-h3 { font-size: 15px; font-weight: 600; color: var(--gray-700); margin: 12px 0 8px; }
        .md-spacer { height: 8px; }
        .md-bullet-item {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 6px; padding-left: 4px;
        }
        .md-bullet-dot { color: var(--primary); font-weight: bold; flex-shrink: 0; }
        .md-numbered-item {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 6px; padding-left: 4px;
        }
        .md-number { color: var(--primary); font-weight: 600; min-width: 20px; flex-shrink: 0; }

        .slides-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;
        }
        .slide-card {
          background: var(--gray-50); border-radius: 12px; padding: 20px;
          border: 1px solid var(--gray-200);
        }
        .slide-number { font-size: 12px; color: var(--primary); font-weight: 600; margin-bottom: 8px; }
        .slide-card h4 { color: var(--gray-800); margin-bottom: 12px; font-size: 16px; }
        .slide-content { color: var(--gray-600); font-size: 14px; line-height: 1.6; }
        .slide-content .md-line { margin-bottom: 6px; }
        .slide-content .md-h1, .slide-content .md-h2, .slide-content .md-h3 {
          font-size: 14px; margin: 10px 0 6px;
        }
        .slide-content .md-bullet-item, .slide-content .md-numbered-item {
          font-size: 13px; margin-bottom: 4px;
        }
        .slide-notes {
          margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--gray-300);
          font-size: 13px; color: var(--gray-500); font-style: italic;
        }

        .quiz-list { display: flex; flex-direction: column; gap: 20px; }
        .quiz-item { background: var(--gray-50); border-radius: 12px; padding: 20px; }
        .quiz-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        }
        .quiz-number { font-weight: 700; color: var(--primary); }
        .quiz-question { color: var(--gray-800); font-weight: 500; margin-bottom: 16px; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-option {
          padding: 10px 14px; background: white; border-radius: 8px;
          font-size: 14px; color: var(--gray-600); border: 1px solid var(--gray-200);
        }
        .quiz-option.correct {
          background: rgb(34 197 94 / 0.1); border-color: #22c55e; color: #16a34a;
        }

        .homework-list { display: flex; flex-direction: column; gap: 12px; }
        .homework-item {
          display: flex; align-items: flex-start; gap: 16px; padding: 16px;
          background: var(--gray-50); border-radius: 12px;
        }
        .homework-number {
          width: 28px; height: 28px; background: var(--primary); color: white;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 14px; flex-shrink: 0;
        }
        .homework-item p { color: var(--gray-700); line-height: 1.6; }
      `}</style>
    </div>
  );
}
