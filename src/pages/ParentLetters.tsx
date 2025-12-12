import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { generateBehaviorLetter, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import LoadingSpinner from '../components/LoadingSpinner';
import type { BehaviorLetter, HistoryItem } from '../types';

const commonIssues = [
  'Frequent tardiness',
  'Incomplete homework',
  'Disruptive behavior in class',
  'Lack of participation',
  'Bullying concerns',
  'Academic performance decline',
  'Attendance issues',
  'Not following dress code',
];

export default function ParentLetters() {
  const location = useLocation();
  const [studentName, setStudentName] = useState('');
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState<BehaviorLetter | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'letter') {
      setLoadedFromHistory(true);
      const data = state.historyItem.data as BehaviorLetter;
      setLetter(data);
      setStudentName(data.studentName);
      setIssue(data.issue);
    }
  }, [location.state]);

  // Auto-save to history when letter is generated (skip if loaded from history)
  useEffect(() => {
    if (letter && !loadedFromHistory) {
      saveToHistory(
        'letter',
        `Letter for ${letter.studentName}`,
        letter.issue,
        letter
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [letter]);

  const handleGenerate = async () => {
    if (!studentName || !issue) {
      setError('Please provide student name and issue');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await generateBehaviorLetter(studentName, issue);
      setLetter(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate letter');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const copyToClipboard = () => {
    if (!letter) return;
    navigator.clipboard.writeText(letter.letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <Mail size={28} />
        </div>
        <div>
          <h1>Behavior Letter Generator</h1>
          <p>Generate professional parent letters in seconds</p>
        </div>
      </header>

      <div className="content-grid">
        <div className="card form-card">
          <div className="form-group">
            <label className="label">
              <User size={16} />
              Student Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="Enter student's full name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">
              <AlertCircle size={16} />
              Issue / Concern
            </label>
            <textarea
              className="input textarea"
              placeholder="Describe the behavior issue or concern..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={4}
            />
          </div>

          <div className="quick-issues">
            <span className="quick-label">Quick select:</span>
            <div className="issues-tags">
              {commonIssues.map((commonIssue) => (
                <button
                  key={commonIssue}
                  className={`issue-tag ${issue === commonIssue ? 'selected' : ''}`}
                  onClick={() => setIssue(commonIssue)}
                >
                  {commonIssue}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn btn-primary generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Mail size={20} />
            Generate Letter
          </button>
        </div>

        <div className="preview-section">
          <AnimatePresence mode="wait">
            {loading && <LoadingSpinner message="Writing professional letter..." />}

            {!loading && !letter && (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Mail size={48} />
                <h3>No letter generated yet</h3>
                <p>Fill in the details and click generate to create a professional parent letter</p>
              </motion.div>
            )}

            {letter && !loading && (
              <motion.div
                className="letter-preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="letter-header">
                  <h3>Generated Letter</h3>
                  <div className="letter-actions">
                    <button className="btn btn-secondary" onClick={handleRegenerate}>
                      <RefreshCw size={16} />
                      Regenerate
                    </button>
                    <button className="btn btn-secondary" onClick={copyToClipboard}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="letter-meta">
                  <span><User size={14} /> {letter.studentName}</span>
                  <span><AlertCircle size={14} /> {letter.issue}</span>
                </div>

                <div className="letter-content">
                  {letter.letter.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .page { max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .page-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white;
        }
        .page-header h1 { font-size: 28px; color: var(--gray-800); margin-bottom: 4px; }
        .page-header p { color: var(--gray-500); }

        .content-grid { display: grid; grid-template-columns: 400px 1fr; gap: 24px; }
        @media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

        .form-card { height: fit-content; }
        .form-group { margin-bottom: 20px; }
        .label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .textarea { min-height: 100px; }

        .quick-issues { margin-bottom: 20px; }
        .quick-label { font-size: 13px; color: var(--gray-500); display: block; margin-bottom: 10px; }
        .issues-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .issue-tag {
          padding: 6px 12px; background: var(--gray-100); border: 1px solid var(--gray-200);
          border-radius: 20px; font-size: 13px; color: var(--gray-600);
          cursor: pointer; transition: all 0.2s;
        }
        .issue-tag:hover { border-color: var(--primary-light); color: var(--primary); }
        .issue-tag.selected {
          background: rgb(124 58 237 / 0.1); border-color: var(--primary);
          color: var(--primary);
        }

        .error-message {
          margin-bottom: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .generate-btn { width: 100%; padding: 14px; }

        .preview-section { min-height: 400px; }

        .empty-state {
          background: white; border-radius: 16px; padding: 60px 40px;
          text-align: center; box-shadow: var(--shadow-md);
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 400px;
        }
        .empty-state svg { color: var(--gray-300); margin-bottom: 16px; }
        .empty-state h3 { color: var(--gray-600); margin-bottom: 8px; }
        .empty-state p { color: var(--gray-400); font-size: 14px; }

        .letter-preview {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: var(--shadow-md);
        }
        .letter-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
        }
        .letter-header h3 { color: var(--gray-800); }
        .letter-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .letter-actions .btn { padding: 8px 14px; font-size: 13px; }

        .letter-meta {
          display: flex; gap: 20px; margin-bottom: 20px;
          padding-bottom: 16px; border-bottom: 1px solid var(--gray-200);
        }
        .letter-meta span {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--gray-500);
        }

        .letter-content {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-radius: 12px; padding: 24px;
          font-family: 'Georgia', serif; line-height: 1.8;
        }
        .letter-content p {
          margin-bottom: 16px; color: var(--gray-700);
        }
        .letter-content p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
