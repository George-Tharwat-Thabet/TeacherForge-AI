import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, CheckSquare, BarChart3, Calendar,
  Mail, Sparkles, Menu, X, Clock
} from 'lucide-react';
import HistoryModal from './HistoryModal';
import type { HistoryItem } from '../types';

const navItems = [
  { path: '/', icon: BookOpen, label: 'Lesson Generator' },
  { path: '/exams', icon: FileText, label: 'Exam Generator' },
  { path: '/grading', icon: CheckSquare, label: 'Auto-Grading' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/timetable', icon: Calendar, label: 'Timetable' },
  { path: '/letters', icon: Mail, label: 'Parent Letters' },
  { path: '/remix', icon: Sparkles, label: 'Lesson Remix' },
];

const typeToPath: Record<string, string> = {
  lesson: '/',
  exam: '/exams',
  grading: '/grading',
  remix: '/remix',
  timetable: '/timetable',
  letter: '/letters',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleHistorySelect = (item: HistoryItem) => {
    const path = typeToPath[item.type];
    if (path) {
      navigate(path, { state: { historyItem: item } });
    }
  };

  return (
    <div className="app">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="logo">
          <img src="/logo.png" alt="Teacherforge AI" className="logo-img" />
          <span>Teacherforge AI</span>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="Teacherforge AI" className="sidebar-logo-img" />
          <h1>Teacherforge AI</h1>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    className="active-indicator"
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="history-btn" onClick={() => setHistoryOpen(true)}>
            <Clock size={18} />
            <span>History</span>
          </button>
          <p>Powered by AI</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />

      <style>{`
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: white;
          box-shadow: var(--shadow);
          padding: 0 16px;
          align-items: center;
          gap: 16px;
          z-index: 100;
        }

        .menu-btn, .close-btn {
          background: none;
          border: none;
          color: var(--gray-600);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .menu-btn:hover, .close-btn:hover {
          background: var(--gray-100);
          color: var(--primary);
        }

        .mobile-header .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary);
          font-weight: 700;
          font-size: 18px;
        }

        .logo-img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .sidebar-logo-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 199;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 260px;
          background: white;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          z-index: 200;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--primary);
          border-bottom: 1px solid var(--gray-100);
        }

        .sidebar-header h1 {
          font-size: 20px;
          font-weight: 700;
        }

        .sidebar-header .close-btn {
          display: none;
          margin-left: auto;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--gray-600);
          text-decoration: none;
          border-radius: 12px;
          margin-bottom: 4px;
          position: relative;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: var(--gray-50);
          color: var(--primary);
        }

        .nav-item.active {
          color: var(--primary);
          background: rgb(124 58 237 / 0.1);
          font-weight: 600;
        }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 24px;
          background: var(--primary);
          border-radius: 0 4px 4px 0;
        }

        .sidebar-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--gray-100);
          color: var(--gray-400);
          font-size: 12px;
        }

        .history-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgb(124 58 237 / 0.1) 0%, rgb(139 92 246 / 0.1) 100%);
          border: 1px solid rgb(124 58 237 / 0.2);
          border-radius: 12px;
          color: var(--primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
        }

        .history-btn:hover {
          background: linear-gradient(135deg, rgb(124 58 237 / 0.15) 0%, rgb(139 92 246 / 0.15) 100%);
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .main-content {
          margin-left: 260px;
          padding: 32px;
          min-height: 100vh;
        }

        @media (max-width: 1024px) {
          .mobile-header {
            display: flex;
          }

          .sidebar-overlay {
            display: block;
          }

          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-header .close-btn {
            display: block;
          }

          .main-content {
            margin-left: 0;
            padding: 80px 16px 32px;
          }
        }
      `}</style>
    </div>
  );
}
