import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingDown, TrendingUp, BookOpen, AlertTriangle, Lightbulb } from 'lucide-react';
import { analyzeClassPerformance, generateRevisionLesson, isConfigured } from '../services/gemini';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ClassAnalytics, Lesson } from '../types';

export default function Analytics() {
  const [subject, setSubject] = useState('');
  const [scoresData, setScoresData] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRevision, setLoadingRevision] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [revisionLesson, setRevisionLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!subject || !scoresData) {
      setError('Please provide subject and scores data');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');
    setAnalytics(null);
    setRevisionLesson(null);

    try {
      const scores = scoresData.split('\n').filter(Boolean).map(line => {
        const [topic, studentName, scoreStr] = line.split(',').map(s => s.trim());
        return { topic: topic || '', studentName: studentName || '', score: Number(scoreStr) || 0 };
      });

      const result = await analyzeClassPerformance(subject, scores);
      setAnalytics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze performance');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRevision = async (topic: string) => {
    if (!isConfigured()) return;
    
    setLoadingRevision(topic);
    try {
      const lesson = await generateRevisionLesson(topic, subject, 'General');
      setRevisionLesson(lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate revision lesson');
    } finally {
      setLoadingRevision(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <BarChart3 size={28} />
        </div>
        <div>
          <h1>Class Analytics</h1>
          <p>Identify weak topics and auto-generate targeted revision lessons</p>
        </div>
      </header>

      <div className="card">
        <div className="form-row">
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
        </div>

        <div className="form-group">
          <label className="label">Student Scores (topic, student name, score)</label>
          <textarea
            className="input textarea"
            placeholder="Algebra, John Smith, 85&#10;Algebra, Jane Doe, 72&#10;Geometry, John Smith, 65&#10;Geometry, Jane Doe, 58&#10;Fractions, John Smith, 90&#10;Fractions, Jane Doe, 88"
            value={scoresData}
            onChange={(e) => setScoresData(e.target.value)}
            rows={8}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="btn btn-primary analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          <BarChart3 size={20} />
          Analyze Performance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSpinner message="Analyzing class performance..." />}

        {analytics && !loading && (
          <motion.div
            className="analytics-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="overview-cards">
              <div className="overview-card">
                <div className="overview-icon students">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <span className="overview-value">{analytics.totalStudents}</span>
                  <span className="overview-label">Total Students</span>
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-icon average">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span className="overview-value">{analytics.averageScore}%</span>
                  <span className="overview-label">Class Average</span>
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-icon weak">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <span className="overview-value">{analytics.weakTopics.length}</span>
                  <span className="overview-label">Weak Topics</span>
                </div>
              </div>
            </div>

            <div className="analytics-grid">
              <div className="analytics-section">
                <h3><TrendingDown size={20} /> Weak Topics</h3>
                <div className="topics-list">
                  {analytics.weakTopics.map((topic, i) => (
                    <motion.div
                      key={i}
                      className="topic-card weak"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="topic-info">
                        <span className="topic-name">{topic.topic}</span>
                        <span className="topic-score">{topic.averageScore}% avg</span>
                      </div>
                      <div className="topic-meta">
                        {topic.studentsStruggling} students struggling
                      </div>
                      <div className="progress">
                        <div className="progress-bar weak" style={{ width: `${topic.averageScore}%` }} />
                      </div>
                      <button
                        className="btn btn-secondary revision-btn"
                        onClick={() => handleGenerateRevision(topic.topic)}
                        disabled={loadingRevision === topic.topic}
                      >
                        {loadingRevision === topic.topic ? 'Generating...' : 'Generate Revision Lesson'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="analytics-section">
                <h3><TrendingUp size={20} /> Strong Topics</h3>
                <div className="topics-list">
                  {analytics.strongTopics.map((topic, i) => (
                    <motion.div
                      key={i}
                      className="topic-card strong"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span className="topic-name">{topic}</span>
                      <span className="badge badge-success">Strong</span>
                    </motion.div>
                  ))}
                </div>

                <h3 style={{ marginTop: 24 }}><Lightbulb size={20} /> Recommendations</h3>
                <div className="recommendations-list">
                  {analytics.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      className="recommendation-item"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span className="rec-number">{i + 1}</span>
                      <p>{rec}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {revisionLesson && (
              <motion.div
                className="revision-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3><BookOpen size={20} /> Generated Revision Lesson</h3>
                <div className="revision-content">
                  <h4>{revisionLesson.title}</h4>
                  <p>{revisionLesson.explanation}</p>
                  <div className="revision-meta">
                    <span className="badge badge-primary">{revisionLesson.slides.length} Slides</span>
                    <span className="badge badge-success">{revisionLesson.quiz.length} Quiz Questions</span>
                  </div>
                </div>
              </motion.div>
            )}
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

        .form-row { margin-bottom: 20px; }
        .textarea { min-height: 180px; font-family: monospace; font-size: 13px; }

        .error-message {
          margin-bottom: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .analyze-btn { width: 100%; padding: 16px; font-size: 16px; }

        .analytics-results { margin-top: 32px; }

        .overview-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 640px) { .overview-cards { grid-template-columns: 1fr; } }

        .overview-card {
          background: white; border-radius: 16px; padding: 20px;
          box-shadow: var(--shadow-md); display: flex; align-items: center; gap: 16px;
        }
        .overview-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .overview-icon.students { background: rgb(124 58 237 / 0.1); color: var(--primary); }
        .overview-icon.average { background: rgb(34 197 94 / 0.1); color: #16a34a; }
        .overview-icon.weak { background: rgb(239 68 68 / 0.1); color: #dc2626; }
        .overview-value { display: block; font-size: 28px; font-weight: 700; color: var(--gray-800); }
        .overview-label { color: var(--gray-500); font-size: 14px; }

        .analytics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        @media (max-width: 768px) { .analytics-grid { grid-template-columns: 1fr; } }

        .analytics-section {
          background: white; border-radius: 16px; padding: 24px; box-shadow: var(--shadow-md);
        }
        .analytics-section h3 {
          display: flex; align-items: center; gap: 8px;
          color: var(--gray-800); margin-bottom: 16px;
        }

        .topics-list { display: flex; flex-direction: column; gap: 12px; }
        .topic-card {
          padding: 16px; border-radius: 12px;
        }
        .topic-card.weak { background: rgb(239 68 68 / 0.05); border: 1px solid rgb(239 68 68 / 0.2); }
        .topic-card.strong {
          background: rgb(34 197 94 / 0.05); border: 1px solid rgb(34 197 94 / 0.2);
          display: flex; justify-content: space-between; align-items: center;
        }

        .topic-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .topic-name { font-weight: 600; color: var(--gray-800); }
        .topic-score { color: #dc2626; font-weight: 500; }
        .topic-meta { font-size: 13px; color: var(--gray-500); margin-bottom: 12px; }

        .progress-bar.weak { background: linear-gradient(90deg, #dc2626 0%, #f87171 100%); }

        .revision-btn { width: 100%; margin-top: 12px; }

        .recommendations-list { display: flex; flex-direction: column; gap: 12px; }
        .recommendation-item {
          display: flex; gap: 12px; padding: 12px;
          background: var(--gray-50); border-radius: 10px;
        }
        .rec-number {
          width: 24px; height: 24px; background: var(--primary); color: white;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 12px; flex-shrink: 0;
        }
        .recommendation-item p { color: var(--gray-600); font-size: 14px; line-height: 1.5; }

        .revision-section {
          margin-top: 24px; background: white; border-radius: 16px;
          padding: 24px; box-shadow: var(--shadow-md);
        }
        .revision-section h3 {
          display: flex; align-items: center; gap: 8px;
          color: var(--gray-800); margin-bottom: 16px;
        }
        .revision-content {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-radius: 12px; padding: 20px;
        }
        .revision-content h4 { color: var(--primary); margin-bottom: 12px; }
        .revision-content p { color: var(--gray-600); line-height: 1.7; margin-bottom: 16px; }
        .revision-meta { display: flex; gap: 8px; }
      `}</style>
    </div>
  );
}
