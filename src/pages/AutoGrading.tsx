import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Users, Award, MessageSquare, Download, Upload, X, Image, FileText } from 'lucide-react';
import { gradeExamPapers, gradeFromImages, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Exam, QuizQuestion, GradedResult, HistoryItem } from '../types';

interface GradedPaper {
  studentName: string;
  score: number;
  feedback: string;
  detailedResults?: { question: string; answer: string; correct: boolean; points: number }[];
}

interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'pdf';
}

type TabType = 'manual' | 'upload';

export default function AutoGrading() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  
  // Manual tab state
  const [examData, setExamData] = useState('');
  const [papersData, setPapersData] = useState('');
  
  // Upload tab state
  const [studentName, setStudentName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GradedPaper[]>([]);
  const [error, setError] = useState('');
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'grading') {
      setLoadedFromHistory(true);
      const data = state.historyItem.data as GradedResult;
      setResults([data]);
    }
  }, [location.state]);

  // Auto-save to history when grading is complete (skip if loaded from history)
  useEffect(() => {
    if (results.length > 0 && !loadedFromHistory) {
      const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
      const title = results.length === 1 ? results[0].studentName : `${results.length} Students`;
      saveToHistory(
        'grading',
        `Grading: ${title}`,
        `Average score: ${avgScore}%`,
        { ...results[0], id: crypto.randomUUID(), createdAt: new Date() } as GradedResult
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [results]);

  const handleGrade = async () => {
    if (!examData || !papersData) {
      setError('Please provide both exam questions and student papers');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const questions: QuizQuestion[] = examData.split('\n').filter(Boolean).map((q, i) => ({
        id: String(i),
        type: 'essay',
        question: q.split('|')[0]?.trim() || q,
        correctAnswer: q.split('|')[1]?.trim() || '',
        points: 10
      }));

      const exam: Exam = {
        id: '1',
        title: 'Exam',
        subject: 'General',
        grade: 'General',
        type: 'essay',
        questions,
        totalPoints: questions.length * 10,
        duration: 60,
        createdAt: new Date()
      };

      const papers = papersData.split('\n---\n').filter(Boolean).map(block => {
        const lines = block.trim().split('\n');
        const studentName = lines[0]?.replace('Student:', '').trim() || 'Unknown';
        const answers: Record<string, string> = {};
        lines.slice(1).forEach((line, i) => {
          answers[String(i)] = line.replace(/^\d+\.\s*/, '').trim();
        });
        return { studentName, answers };
      });

      const graded = await gradeExamPapers(exam, papers);
      setResults(graded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade papers');
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

  const handleGradeFromImages = async () => {
    if (!studentName.trim()) {
      setError('Please enter the student name');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('Please upload at least one answer sheet');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const images = uploadedFiles.map(f => ({
        base64: f.base64,
        mimeType: f.mimeType
      }));
      const result = await gradeFromImages(studentName, images);
      setResults([result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade from images');
    } finally {
      setLoading(false);
    }
  };

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) 
    : 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <CheckSquare size={28} />
        </div>
        <div>
          <h1>Auto-Grading</h1>
          <p>Grade 100+ papers with personalized feedback in under 2 minutes</p>
        </div>
      </header>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Entry
          </button>
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Answers
          </button>
        </div>

        {activeTab === 'manual' && (
          <>
            <div className="grading-grid">
              <div className="inner-card">
                <h3>📋 Exam Questions</h3>
                <p className="card-desc">Enter questions with answers separated by |</p>
                <textarea
                  className="input textarea"
                  placeholder="What is photosynthesis? | The process by which plants convert sunlight to energy&#10;What is the capital of France? | Paris"
                  value={examData}
                  onChange={(e) => setExamData(e.target.value)}
                  rows={8}
                />
              </div>

              <div className="inner-card">
                <h3>📝 Student Papers</h3>
                <p className="card-desc">Separate each student with --- on a new line</p>
                <textarea
                  className="input textarea"
                  placeholder="Student: John Smith&#10;1. Photosynthesis is when plants make food from sunlight&#10;2. Paris&#10;---&#10;Student: Jane Doe&#10;1. Plants use photosynthesis to create energy&#10;2. London"
                  value={papersData}
                  onChange={(e) => setPapersData(e.target.value)}
                  rows={8}
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              className="btn btn-primary grade-btn"
              onClick={handleGrade}
              disabled={loading}
            >
              <CheckSquare size={20} />
              Grade All Papers
            </button>
          </>
        )}


        {activeTab === 'upload' && (
          <>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="label">Student Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter student name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <div className="upload-section">
              <label className="label">Upload Answer Sheets (up to 5 images or PDF)</label>
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
                        <img src={f.preview} alt={`Answer ${index + 1}`} />
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

            {error && <div className="error-message">{error}</div>}

            <button
              className="btn btn-primary grade-btn"
              onClick={handleGradeFromImages}
              disabled={loading || uploadedFiles.length === 0 || !studentName.trim()}
            >
              <CheckSquare size={20} />
              Grade Answer Sheets
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSpinner message="Grading papers and generating feedback..." />}

        {results.length > 0 && !loading && (
          <motion.div
            className="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="results-header">
              <h2>Grading Results</h2>
              <button className="btn btn-secondary">
                <Download size={18} />
                Export Results
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <Users size={24} />
                <div>
                  <span className="stat-value">{results.length}</span>
                  <span className="stat-label">Papers Graded</span>
                </div>
              </div>
              <div className="stat-card">
                <Award size={24} />
                <div>
                  <span className="stat-value">{avgScore}%</span>
                  <span className="stat-label">Average Score</span>
                </div>
              </div>
              <div className="stat-card">
                <MessageSquare size={24} />
                <div>
                  <span className="stat-value">{results.length}</span>
                  <span className="stat-label">Feedback Generated</span>
                </div>
              </div>
            </div>

            <div className="papers-list">
              {results.map((paper, i) => (
                <motion.div
                  key={i}
                  className="paper-card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="paper-header">
                    <div className="student-info">
                      <div className="student-avatar">
                        {paper.studentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="student-name">{paper.studentName}</span>
                    </div>
                    <div className={`score-badge ${paper.score >= 70 ? 'pass' : 'fail'}`}>
                      {paper.score}%
                    </div>
                  </div>
                  <div className="progress">
                    <motion.div
                      className="progress-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${paper.score}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                    />
                  </div>
                  <div className="feedback-box">
                    <MessageSquare size={16} />
                    <p>{paper.feedback}</p>
                  </div>
                  
                  {paper.detailedResults && paper.detailedResults.length > 0 && (
                    <div className="detailed-results">
                      <h4>Detailed Results</h4>
                      {paper.detailedResults.map((result, j) => (
                        <div key={j} className={`result-item ${result.correct ? 'correct' : 'incorrect'}`}>
                          <div className="result-question">{result.question}</div>
                          <div className="result-answer">Answer: {result.answer}</div>
                          <div className="result-points">{result.points} pts</div>
                        </div>
                      ))}
                    </div>
                  )}
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

        .grading-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }
        @media (max-width: 768px) { .grading-grid { grid-template-columns: 1fr; } }

        .inner-card { background: var(--gray-50); border-radius: 12px; padding: 20px; }
        .inner-card h3 { margin-bottom: 8px; color: var(--gray-800); }
        .card-desc { color: var(--gray-500); font-size: 13px; margin-bottom: 16px; }
        .textarea { min-height: 200px; font-family: inherit; }

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

        .error-message {
          margin-bottom: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .grade-btn { width: 100%; padding: 16px; font-size: 16px; }

        .results-section { margin-top: 32px; }
        .results-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
        }
        .results-header h2 { font-size: 24px; color: var(--gray-800); }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

        .stat-card {
          background: white; border-radius: 16px; padding: 20px;
          box-shadow: var(--shadow-md); display: flex; align-items: center; gap: 16px;
        }
        .stat-card svg { color: var(--primary); }
        .stat-value { display: block; font-size: 28px; font-weight: 700; color: var(--gray-800); }
        .stat-label { color: var(--gray-500); font-size: 14px; }

        .papers-list { display: flex; flex-direction: column; gap: 16px; }
        .paper-card {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: var(--shadow-md);
        }
        .paper-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .student-info { display: flex; align-items: center; gap: 12px; }
        .student-avatar {
          width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700;
        }
        .student-name { font-weight: 600; color: var(--gray-800); }

        .score-badge {
          padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 18px;
        }
        .score-badge.pass { background: rgb(34 197 94 / 0.1); color: #16a34a; }
        .score-badge.fail { background: rgb(239 68 68 / 0.1); color: #dc2626; }

        .progress { margin-bottom: 16px; }

        .feedback-box {
          display: flex; gap: 12px; padding: 16px;
          background: var(--gray-50); border-radius: 12px;
        }
        .feedback-box svg { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
        .feedback-box p { color: var(--gray-600); font-size: 14px; line-height: 1.6; }

        .detailed-results { margin-top: 16px; }
        .detailed-results h4 { font-size: 14px; color: var(--gray-700); margin-bottom: 12px; }
        .result-item {
          display: flex; flex-wrap: wrap; gap: 8px; padding: 12px;
          border-radius: 8px; margin-bottom: 8px; align-items: center;
        }
        .result-item.correct { background: rgb(34 197 94 / 0.1); }
        .result-item.incorrect { background: rgb(239 68 68 / 0.1); }
        .result-question { flex: 1; min-width: 200px; font-weight: 500; color: var(--gray-800); }
        .result-answer { flex: 1; min-width: 150px; color: var(--gray-600); font-size: 14px; }
        .result-points { font-weight: 600; font-size: 14px; color: var(--gray-500); }
      `}</style>
    </div>
  );
}
