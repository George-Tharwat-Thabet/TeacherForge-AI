import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, Award, Download, Copy, Check, Upload, X, Image, ChevronDown } from 'lucide-react';
import { generateExamMultiType, generateExamFromImagesMultiType, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import { exportExamToPDF, exportExamToPDFBW } from '../services/pdfExport';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Exam, HistoryItem } from '../types';

const examTypes = [
  { id: 'mcq', label: 'Multiple Choice', icon: '🔘' },
  { id: 'essay', label: 'Essay Questions', icon: '📝' },
  { id: 'matching', label: 'Matching', icon: '🔗' },
  { id: 'true-false', label: 'True/False', icon: '✓✗' },
  { id: 'fill-blank', label: 'Fill in the Blank', icon: '___' },
] as const;

type ExamTypeId = typeof examTypes[number]['id'];
type TabType = 'drafting' | 'upload';

interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'pdf';
}

interface SelectedTypeConfig {
  [key: string]: number; // typeId -> questionCount
}

export default function ExamGenerator() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('drafting');
  
  // Drafting tab state
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<SelectedTypeConfig>({ mcq: 10 });
  
  // Upload tab state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadSelectedTypes, setUploadSelectedTypes] = useState<SelectedTypeConfig>({ mcq: 10 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'exam') {
      setLoadedFromHistory(true);
      setExam(state.historyItem.data as Exam);
    }
  }, [location.state]);

  // Auto-save to history when exam is generated (skip if loaded from history)
  useEffect(() => {
    if (exam && !loadedFromHistory) {
      saveToHistory(
        'exam',
        exam.title,
        `${exam.subject} - ${exam.questions.length} questions`,
        exam
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [exam]);

  // Toggle type selection
  const toggleType = (typeId: ExamTypeId, isUpload: boolean = false) => {
    const setter = isUpload ? setUploadSelectedTypes : setSelectedTypes;
    const current = isUpload ? uploadSelectedTypes : selectedTypes;
    
    if (current[typeId] !== undefined) {
      // Remove type
      const newTypes = { ...current };
      delete newTypes[typeId];
      // Ensure at least one type is selected
      if (Object.keys(newTypes).length === 0) return;
      setter(newTypes);
    } else {
      // Add type with default 5 questions
      setter({ ...current, [typeId]: 5 });
    }
  };

  // Update question count for a type
  const updateTypeCount = (typeId: string, count: number, isUpload: boolean = false) => {
    const setter = isUpload ? setUploadSelectedTypes : setSelectedTypes;
    const current = isUpload ? uploadSelectedTypes : selectedTypes;
    setter({ ...current, [typeId]: Math.max(1, Math.min(30, count)) });
  };

  // Get total question count
  const getTotalQuestions = (types: SelectedTypeConfig) => {
    return Object.values(types).reduce((sum, count) => sum + count, 0);
  };

  const handleGenerate = async () => {
    if (!subject || !topic || !grade) {
      setError('Please fill in all fields');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    if (Object.keys(selectedTypes).length === 0) {
      setError('Please select at least one exam type');
      return;
    }

    setLoading(true);
    setError('');
    setExam(null);

    try {
      const result = await generateExamMultiType(subject, topic, grade, selectedTypes);
      setExam(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam');
    } finally {
      setLoading(false);
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      setError('Please upload at least one lesson file');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    if (Object.keys(uploadSelectedTypes).length === 0) {
      setError('Please select at least one exam type');
      return;
    }

    setLoading(true);
    setError('');
    setExam(null);

    try {
      const files = uploadedFiles.map(f => ({
        base64: f.base64,
        mimeType: f.mimeType
      }));
      const result = await generateExamFromImagesMultiType(files, uploadSelectedTypes);
      setExam(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam from files');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!exam) return;
    const text = exam.questions.map((q, i) => 
      `${i + 1}. ${q.question}${q.options ? '\n' + q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n') : ''}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <FileText size={28} />
        </div>
        <div>
          <h1>Exam Generator</h1>
          <p>Generate 5 different exam types in under 10 seconds</p>
        </div>
      </header>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'drafting' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafting')}
          >
            Exam Drafting
          </button>
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Multiple Lessons
          </button>
        </div>

        {activeTab === 'drafting' && (
          <>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Subject</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Topic</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Quadratic Equations"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Grade Level</label>
                <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">Select grade...</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="exam-types">
              <label className="label">Exam Types (select one or more)</label>
              <p className="type-hint">Click to select types, then set question count for each</p>
              <div className="type-grid-multi">
                {examTypes.map((type) => {
                  const isSelected = selectedTypes[type.id] !== undefined;
                  return (
                    <div key={type.id} className={`type-card-multi ${isSelected ? 'selected' : ''}`}>
                      <div className="type-card-header" onClick={() => toggleType(type.id)}>
                        <span className="type-icon">{type.icon}</span>
                        <span className="type-label">{type.label}</span>
                        <div className={`type-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="type-count-input">
                          <label>Questions:</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={selectedTypes[type.id]}
                            onChange={(e) => updateTypeCount(type.id, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="total-questions">
                Total Questions: <strong>{getTotalQuestions(selectedTypes)}</strong>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              className="btn btn-primary generate-btn"
              onClick={handleGenerate}
              disabled={loading}
            >
              Generate Exam
            </button>
          </>
        )}


        {activeTab === 'upload' && (
          <>
            <div className="upload-section">
              <label className="label">Upload Lesson Files (up to 5 images or PDF)</label>
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} />
                <p>Click to upload or drag and drop</p>
                <span>PNG, JPG, JPEG, or PDF - up to 5 files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="file-previews">
                  {uploadedFiles.map((f, index) => (
                    <div key={index} className="file-preview">
                      {f.type === 'image' ? (
                        <img src={f.preview} alt={`Lesson ${index + 1}`} />
                      ) : (
                        <div className="pdf-preview">
                          <FileText size={32} />
                          <span>PDF</span>
                        </div>
                      )}
                      <button
                        className="remove-file"
                        onClick={() => removeFile(index)}
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
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Image size={24} />
                      <span>Add more</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="exam-types" style={{ marginTop: '24px' }}>
              <label className="label">Exam Types (select one or more)</label>
              <p className="type-hint">Click to select types, then set question count for each</p>
              <div className="type-grid-multi">
                {examTypes.map((type) => {
                  const isSelected = uploadSelectedTypes[type.id] !== undefined;
                  return (
                    <div key={type.id} className={`type-card-multi ${isSelected ? 'selected' : ''}`}>
                      <div className="type-card-header" onClick={() => toggleType(type.id, true)}>
                        <span className="type-icon">{type.icon}</span>
                        <span className="type-label">{type.label}</span>
                        <div className={`type-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="type-count-input">
                          <label>Questions:</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={uploadSelectedTypes[type.id]}
                            onChange={(e) => updateTypeCount(type.id, Number(e.target.value), true)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="total-questions">
                Total Questions: <strong>{getTotalQuestions(uploadSelectedTypes)}</strong>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              className="btn btn-primary generate-btn"
              onClick={handleGenerateFromFiles}
              disabled={loading || uploadedFiles.length === 0}
            >
              Generate Exam from Lessons
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSpinner message="Generating your exam..." />}

        {exam && !loading && (
          <motion.div
            className="exam-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="exam-header">
              <div>
                <h2>{exam.title}</h2>
                <div className="exam-meta">
                  <span><Clock size={16} /> {exam.duration} minutes</span>
                  <span><Award size={16} /> {exam.totalPoints} points</span>
                </div>
              </div>
              <div className="exam-actions">
                <button className="btn btn-secondary" onClick={copyToClipboard}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <div className="export-dropdown">
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                  >
                    <Download size={18} />
                    Export PDF
                    <ChevronDown size={16} />
                  </button>
                  {showExportMenu && (
                    <div className="export-menu">
                      <button onClick={() => { exportExamToPDF(exam); setShowExportMenu(false); }}>
                        🎨 Color Version
                      </button>
                      <button onClick={() => { exportExamToPDFBW(exam); setShowExportMenu(false); }}>
                        ⬛ Black & White
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="questions-list">
              {exam.questions.map((q, i) => (
                <motion.div
                  key={i}
                  className="question-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="question-header">
                    <span className="question-number">{i + 1}</span>
                    <span className="question-points">{q.points} pts</span>
                  </div>
                  <p className="question-text">{q.question}</p>
                  {q.options && (Array.isArray(q.options) ? q.options : Object.values(q.options)).length > 0 && (
                    <div className="options-list">
                      {(Array.isArray(q.options) ? q.options : Object.values(q.options)).map((opt, j) => (
                        <div key={j} className="option-item">
                          <span className="option-letter">{String.fromCharCode(65 + j)}</span>
                          <span>{String(opt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="answer-key">
                    Answer: {
                      Array.isArray(q.correctAnswer) 
                        ? q.correctAnswer.join(', ') 
                        : typeof q.correctAnswer === 'object' && q.correctAnswer !== null
                          ? Object.values(q.correctAnswer).join(', ')
                          : String(q.correctAnswer)
                    }
                  </div>
                </motion.div>
              ))}
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

        .tabs {
          display: flex; gap: 8px; margin-bottom: 24px;
          border-bottom: 2px solid var(--gray-200); padding-bottom: 0;
        }
        .tab {
          padding: 12px 24px; background: none; border: none;
          font-size: 15px; font-weight: 500; color: var(--gray-500);
          cursor: pointer; position: relative; transition: color 0.2s;
        }
        .tab:hover { color: var(--gray-700); }
        .tab.active { color: var(--primary); }
        .tab.active::after {
          content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
          height: 2px; background: var(--primary); border-radius: 2px 2px 0 0;
        }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
        @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }

        .upload-section { margin-bottom: 24px; }
        .upload-zone {
          border: 2px dashed var(--gray-300); border-radius: 12px;
          padding: 40px 20px; text-align: center; cursor: pointer;
          transition: all 0.2s; background: var(--gray-50);
        }
        .upload-zone:hover { border-color: var(--primary); background: rgb(124 58 237 / 0.05); }
        .upload-zone svg { color: var(--gray-400); margin-bottom: 12px; }
        .upload-zone p { color: var(--gray-600); font-weight: 500; margin-bottom: 4px; }
        .upload-zone span { color: var(--gray-400); font-size: 13px; }

        .file-previews {
          display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px;
        }
        .file-preview {
          position: relative; width: 100px; display: flex; flex-direction: column;
        }
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

        .exam-types { margin-bottom: 24px; }
        .type-hint { color: var(--gray-500); font-size: 13px; margin-bottom: 12px; }
        .type-grid-multi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 768px) { .type-grid-multi { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .type-grid-multi { grid-template-columns: 1fr; } }

        .type-card-multi {
          background: var(--gray-50); border: 2px solid var(--gray-200);
          border-radius: 12px; transition: all 0.2s; overflow: hidden;
        }
        .type-card-multi:hover { border-color: var(--primary-light); }
        .type-card-multi.selected {
          border-color: var(--primary); background: rgb(124 58 237 / 0.05);
        }
        .type-card-header {
          padding: 14px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
        }
        .type-icon { font-size: 20px; }
        .type-label { flex: 1; font-weight: 500; font-size: 14px; }
        .type-checkbox {
          width: 22px; height: 22px; border: 2px solid var(--gray-300);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .type-checkbox.checked {
          background: var(--primary); border-color: var(--primary); color: white;
        }
        .type-count-input {
          padding: 10px 12px; background: rgb(124 58 237 / 0.08);
          border-top: 1px solid rgb(124 58 237 / 0.2);
          display: flex; align-items: center; gap: 8px;
        }
        .type-count-input label { font-size: 13px; color: var(--gray-600); }
        .type-count-input input {
          width: 60px; padding: 6px 8px; border: 1px solid var(--gray-300);
          border-radius: 6px; font-size: 14px; text-align: center;
        }
        .total-questions {
          margin-top: 16px; padding: 12px 16px; background: var(--gray-100);
          border-radius: 10px; font-size: 15px; color: var(--gray-700);
        }
        .total-questions strong { color: var(--primary); }

        .error-message {
          margin-bottom: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .generate-btn { width: 100%; padding: 16px; font-size: 16px; }

        .exam-result { margin-top: 32px; }
        .exam-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
        }
        .exam-header h2 { font-size: 24px; color: var(--gray-800); margin-bottom: 8px; }
        .exam-meta { display: flex; gap: 20px; color: var(--gray-500); font-size: 14px; }
        .exam-meta span { display: flex; align-items: center; gap: 6px; }
        .exam-actions { display: flex; gap: 12px; }

        .export-dropdown { position: relative; }
        .export-dropdown .btn { display: flex; align-items: center; gap: 6px; }
        .export-menu {
          position: absolute; top: 100%; right: 0; margin-top: 8px;
          background: white; border-radius: 12px; box-shadow: var(--shadow-lg);
          overflow: hidden; z-index: 100; min-width: 180px;
        }
        .export-menu button {
          width: 100%; padding: 12px 16px; border: none; background: none;
          text-align: left; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; gap: 8px; transition: background 0.2s;
        }
        .export-menu button:hover { background: var(--gray-100); }

        .questions-list { display: flex; flex-direction: column; gap: 16px; }
        .question-card {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: var(--shadow-md);
        }
        .question-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        }
        .question-number {
          width: 32px; height: 32px; background: var(--primary); color: white;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-weight: 700;
        }
        .question-points { color: var(--gray-400); font-size: 14px; }
        .question-text { color: var(--gray-800); font-weight: 500; line-height: 1.6; margin-bottom: 16px; }

        .options-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .option-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          background: var(--gray-50); border-radius: 10px;
        }
        .option-letter {
          width: 24px; height: 24px; background: var(--gray-200); border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 12px; color: var(--gray-600);
        }

        .answer-key {
          padding: 12px 16px; background: rgb(34 197 94 / 0.1); border-radius: 10px;
          color: #16a34a; font-size: 14px; font-weight: 500;
        }
      `}</style>
    </div>
  );
}
