import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Clock, Search, Filter } from 'lucide-react';
import { getHistory, deleteFromHistory, clearHistory, getTypeLabel, getTypeIcon } from '../services/history';
import type { HistoryItem, HistoryItemType } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

const typeFilters: { value: HistoryItemType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lesson', label: 'Lessons' },
  { value: 'exam', label: 'Exams' },
  { value: 'grading', label: 'Grading' },
  { value: 'remix', label: 'Remixes' },
  { value: 'timetable', label: 'Timetables' },
  { value: 'letter', label: 'Letters' },
];

export default function HistoryModal({ isOpen, onClose, onSelect }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryItemType | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  const filteredHistory = history
    .filter(item => {
      const matchesFilter = filter === 'all' || item.type === filter;
      const matchesSearch = search === '' || 
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.preview.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (search === '') return 0;
      const searchLower = search.toLowerCase();
      const aStartsWithTitle = a.title.toLowerCase().startsWith(searchLower);
      const bStartsWithTitle = b.title.toLowerCase().startsWith(searchLower);
      const aStartsWithPreview = a.preview.toLowerCase().startsWith(searchLower);
      const bStartsWithPreview = b.preview.toLowerCase().startsWith(searchLower);
      
      // Title starts with search term has highest priority
      if (aStartsWithTitle && !bStartsWithTitle) return -1;
      if (!aStartsWithTitle && bStartsWithTitle) return 1;
      // Preview starts with search term has second priority
      if (aStartsWithPreview && !bStartsWithPreview) return -1;
      if (!aStartsWithPreview && bStartsWithPreview) return 1;
      return 0;
    });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFromHistory(id);
    setHistory(getHistory());
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;


  return (
    <AnimatePresence>
      <motion.div
        key="history-modal-overlay"
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          key="history-modal-content"
          className="modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="header-title">
              <Clock size={24} />
              <h2>History</h2>
            </div>
            <div className="header-actions">
              {history.length > 0 && (
                <button className="clear-btn" onClick={handleClearAll}>
                  <Trash2 size={16} />
                  Clear All
                </button>
              )}
              <button className="close-btn" onClick={onClose}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="modal-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              <Filter size={16} />
              {typeFilters.map(f => (
                <button
                  key={f.value}
                  className={`filter-tab ${filter === f.value ? 'active' : ''}`}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-body">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <Clock size={48} />
                <h3>No history yet</h3>
                <p>Your generated content will appear here</p>
              </div>
            ) : (
              <div className="history-list">
                {filteredHistory.map((item, index) => (
                  <motion.div
                    key={item.id || `history-${index}`}
                    className="history-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => { onSelect(item); onClose(); }}
                  >
                    <div className="item-icon">{getTypeIcon(item.type)}</div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-type">{getTypeLabel(item.type)}</span>
                        <span className="item-date">{formatDate(item.createdAt)}</span>
                      </div>
                      <h4 className="item-title">{item.title}</h4>
                      <p className="item-preview">{item.preview}</p>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(item.id, e)}
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-content {
          background: white; border-radius: 20px; width: 100%; max-width: 700px;
          max-height: 80vh; display: flex; flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px; border-bottom: 1px solid var(--gray-200);
        }
        .header-title { display: flex; align-items: center; gap: 12px; }
        .header-title svg { color: var(--primary); }
        .header-title h2 { font-size: 20px; color: var(--gray-800); }
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .clear-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 12px; background: rgb(239 68 68 / 0.1);
          color: #dc2626; border: none; border-radius: 8px;
          font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .clear-btn:hover { background: rgb(239 68 68 / 0.2); }
        .close-btn {
          background: none; border: none; color: var(--gray-400);
          cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s;
        }
        .close-btn:hover { background: var(--gray-100); color: var(--gray-600); }

        .modal-filters { padding: 16px 24px; border-bottom: 1px solid var(--gray-100); }
        .search-box {
          display: flex; align-items: center; gap: 10px;
          background: var(--gray-50); border-radius: 10px; padding: 10px 14px;
          margin-bottom: 12px; position: relative; z-index: 1;
        }
        .search-box svg { color: var(--gray-400); }
        .search-box input {
          flex: 1; border: none; background: none; outline: none;
          font-size: 14px; color: var(--gray-700);
        }
        .search-box input::placeholder { color: var(--gray-400); }
        .filter-tabs {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .filter-tabs svg { color: var(--gray-400); }
        .filter-tab {
          padding: 6px 12px; background: var(--gray-100); border: none;
          border-radius: 20px; font-size: 12px; color: var(--gray-600);
          cursor: pointer; transition: all 0.2s;
        }
        .filter-tab:hover { background: var(--gray-200); }
        .filter-tab.active {
          background: var(--primary); color: white;
        }

        .modal-body { flex: 1; overflow-y: auto; padding: 16px 24px; }
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; text-align: center;
        }
        .empty-state svg { color: var(--gray-300); margin-bottom: 16px; }
        .empty-state h3 { color: var(--gray-600); margin-bottom: 8px; }
        .empty-state p { color: var(--gray-400); font-size: 14px; }

        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-item {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px; background: var(--gray-50); border-radius: 12px;
          cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
        }
        .history-item:hover {
          background: white; border-color: var(--primary-light);
          box-shadow: var(--shadow-sm);
        }
        .item-icon { font-size: 24px; }
        .item-content { flex: 1; min-width: 0; }
        .item-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 4px;
        }
        .item-type {
          font-size: 11px; font-weight: 600; color: var(--primary);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .item-date { font-size: 12px; color: var(--gray-400); }
        .item-title {
          font-size: 15px; font-weight: 600; color: var(--gray-800);
          margin-bottom: 4px; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-preview {
          font-size: 13px; color: var(--gray-500); line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .delete-btn {
          background: none; border: none; color: var(--gray-300);
          cursor: pointer; padding: 8px; border-radius: 8px;
          transition: all 0.2s; opacity: 0;
        }
        .history-item:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: rgb(239 68 68 / 0.1); color: #dc2626; }
      `}</style>
    </AnimatePresence>
  );
}
