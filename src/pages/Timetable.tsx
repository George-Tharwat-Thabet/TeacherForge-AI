import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Trash2, Clock, Brain, Zap } from 'lucide-react';
import { generateTimetable, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import LoadingSpinner from '../components/LoadingSpinner';
import type { TimetableSlot, HistoryItem } from '../types';

interface Subject {
  name: string;
  hoursPerWeek: number;
  difficulty: 'heavy' | 'medium' | 'light';
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const difficultyColors = {
  heavy: { bg: 'rgb(239 68 68 / 0.1)', color: '#dc2626', label: 'Heavy' },
  medium: { bg: 'rgb(234 179 8 / 0.1)', color: '#ca8a04', label: 'Medium' },
  light: { bg: 'rgb(34 197 94 / 0.1)', color: '#16a34a', label: 'Light' }
};

export default function Timetable() {
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'Mathematics', hoursPerWeek: 5, difficulty: 'heavy' },
    { name: 'Science', hoursPerWeek: 4, difficulty: 'heavy' },
    { name: 'English', hoursPerWeek: 4, difficulty: 'medium' },
  ]);
  const [newSubject, setNewSubject] = useState<{ name: string; hoursPerWeek: number; difficulty: 'heavy' | 'medium' | 'light' }>({ name: '', hoursPerWeek: 3, difficulty: 'medium' });
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [error, setError] = useState('');
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'timetable') {
      setLoadedFromHistory(true);
      setTimetable(state.historyItem.data as TimetableSlot[]);
    }
  }, [location.state]);

  // Auto-save to history when timetable is generated (skip if loaded from history)
  useEffect(() => {
    if (timetable.length > 0 && !loadedFromHistory) {
      const uniqueSubjects = [...new Set(timetable.map(s => s.subject))];
      saveToHistory(
        'timetable',
        'Weekly Timetable',
        `${timetable.length} slots - ${uniqueSubjects.slice(0, 3).join(', ')}${uniqueSubjects.length > 3 ? '...' : ''}`,
        timetable
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [timetable]);

  const addSubject = () => {
    if (!newSubject.name) return;
    setSubjects([...subjects, newSubject]);
    setNewSubject({ name: '', hoursPerWeek: 3, difficulty: 'medium' });
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (subjects.length === 0) {
      setError('Please add at least one subject');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await generateTimetable(subjects);
      setTimetable(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  const getSlotsByDay = (day: string) => timetable.filter(slot => slot.day === day);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon">
          <Calendar size={28} />
        </div>
        <div>
          <h1>Smart Timetable Builder</h1>
          <p>Schedule heavy subjects when students are most alert</p>
        </div>
      </header>

      <div className="card">
        <h3>📚 Subjects</h3>
        
        <div className="subjects-list">
          {subjects.map((subject, i) => (
            <motion.div
              key={i}
              className="subject-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="subject-info">
                <span className="subject-name">{subject.name}</span>
                <span className="subject-hours">{subject.hoursPerWeek}h/week</span>
                <span 
                  className="difficulty-badge"
                  style={{ 
                    background: difficultyColors[subject.difficulty].bg,
                    color: difficultyColors[subject.difficulty].color
                  }}
                >
                  {difficultyColors[subject.difficulty].label}
                </span>
              </div>
              <button className="remove-btn" onClick={() => removeSubject(i)}>
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="add-subject-form">
          <input
            type="text"
            className="input"
            placeholder="Subject name"
            value={newSubject.name}
            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
          />
          <input
            type="number"
            className="input hours-input"
            min={1}
            max={10}
            value={newSubject.hoursPerWeek}
            onChange={(e) => setNewSubject({ ...newSubject, hoursPerWeek: Number(e.target.value) })}
          />
          <select
            className="select"
            value={newSubject.difficulty}
            onChange={(e) => setNewSubject({ ...newSubject, difficulty: e.target.value as Subject['difficulty'] })}
          >
            <option value="heavy">Heavy</option>
            <option value="medium">Medium</option>
            <option value="light">Light</option>
          </select>
          <button className="btn btn-secondary" onClick={addSubject}>
            <Plus size={18} />
            Add
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          <Brain size={20} />
          Generate Smart Timetable
        </button>
      </div>

      <div className="alert-legend">
        <div className="legend-item">
          <Zap size={16} style={{ color: '#16a34a' }} />
          <span>High Alert (8-10 AM) - Best for heavy subjects</span>
        </div>
        <div className="legend-item">
          <Clock size={16} style={{ color: '#ca8a04' }} />
          <span>Medium Alert (10 AM-1 PM)</span>
        </div>
        <div className="legend-item">
          <Clock size={16} style={{ color: '#dc2626' }} />
          <span>Low Alert (1-3 PM) - Best for light subjects</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSpinner message="Creating optimal timetable..." />}

        {timetable.length > 0 && !loading && (
          <motion.div
            className="timetable-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>Weekly Timetable</h2>
            <div className="timetable-grid">
              {days.map((day) => (
                <div key={day} className="day-column">
                  <div className="day-header">{day}</div>
                  <div className="slots-list">
                    {getSlotsByDay(day).map((slot, i) => (
                      <motion.div
                        key={slot.id}
                        className={`slot-card alert-${slot.alertLevel}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="slot-time">{slot.time}</div>
                        <div className="slot-subject">{slot.subject}</div>
                        <div className="slot-duration">{slot.duration} min</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        .card h3 { margin-bottom: 16px; color: var(--gray-800); }

        .subjects-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .subject-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; background: var(--gray-50); border-radius: 10px;
        }
        .subject-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .subject-name { font-weight: 600; color: var(--gray-800); }
        .subject-hours { color: var(--gray-500); font-size: 14px; }
        .difficulty-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .remove-btn {
          background: none; border: none; color: var(--gray-400);
          cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s;
        }
        .remove-btn:hover { background: rgb(239 68 68 / 0.1); color: #dc2626; }

        .add-subject-form {
          display: grid; grid-template-columns: 2fr 80px 120px auto;
          gap: 12px; margin-bottom: 20px;
        }
        @media (max-width: 640px) {
          .add-subject-form { grid-template-columns: 1fr 1fr; }
        }
        .hours-input { text-align: center; }

        .error-message {
          margin-bottom: 16px; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .generate-btn { width: 100%; padding: 16px; font-size: 16px; }

        .alert-legend {
          display: flex; gap: 24px; flex-wrap: wrap;
          margin: 24px 0; padding: 16px;
          background: white; border-radius: 12px; box-shadow: var(--shadow);
        }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gray-600); }

        .timetable-container { margin-top: 16px; }
        .timetable-container h2 { font-size: 24px; color: var(--gray-800); margin-bottom: 20px; }

        .timetable-grid {
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;
          overflow-x: auto; padding-bottom: 16px;
        }
        @media (max-width: 900px) {
          .timetable-grid { grid-template-columns: repeat(5, minmax(150px, 1fr)); }
        }

        .day-column { min-width: 150px; }
        .day-header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white; padding: 12px; border-radius: 12px 12px 0 0;
          font-weight: 600; text-align: center;
        }

        .slots-list {
          background: white; border-radius: 0 0 12px 12px;
          padding: 12px; min-height: 400px; box-shadow: var(--shadow);
          display: flex; flex-direction: column; gap: 8px;
        }

        .slot-card {
          padding: 12px; border-radius: 10px; border-left: 4px solid;
        }
        .slot-card.alert-high {
          background: rgb(34 197 94 / 0.1); border-color: #16a34a;
        }
        .slot-card.alert-medium {
          background: rgb(234 179 8 / 0.1); border-color: #ca8a04;
        }
        .slot-card.alert-low {
          background: rgb(239 68 68 / 0.1); border-color: #dc2626;
        }

        .slot-time { font-size: 11px; color: var(--gray-500); margin-bottom: 4px; }
        .slot-subject { font-weight: 600; color: var(--gray-800); margin-bottom: 4px; }
        .slot-duration { font-size: 12px; color: var(--gray-400); }
      `}</style>
    </div>
  );
}
