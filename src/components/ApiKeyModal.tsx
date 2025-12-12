import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: Props) {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="modal-icon">
              <Key size={32} />
            </div>

            <h2>Configure Gemini API Key</h2>
            <p>Enter your Google Gemini API key to enable AI features.</p>

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                className="input"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoFocus
              />

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!apiKey.trim()}>
                  Save Key
                </button>
              </div>
            </form>

            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="api-link"
            >
              <ExternalLink size={14} />
              Get your free API key from Google AI Studio
            </a>
          </motion.div>

          <style>{`
            .modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
              z-index: 1000;
            }

            .modal {
              background: white;
              border-radius: 20px;
              padding: 32px;
              max-width: 440px;
              width: 100%;
              position: relative;
              box-shadow: var(--shadow-lg);
            }

            .modal-close {
              position: absolute;
              top: 16px;
              right: 16px;
              background: none;
              border: none;
              color: var(--gray-400);
              cursor: pointer;
              padding: 8px;
              border-radius: 8px;
              transition: all 0.2s;
            }

            .modal-close:hover {
              background: var(--gray-100);
              color: var(--gray-600);
            }

            .modal-icon {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              margin-bottom: 20px;
            }

            .modal h2 {
              font-size: 20px;
              margin-bottom: 8px;
              color: var(--gray-800);
            }

            .modal p {
              color: var(--gray-500);
              margin-bottom: 24px;
              font-size: 14px;
            }

            .modal form {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .modal-actions {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
            }

            .api-link {
              display: flex;
              align-items: center;
              gap: 6px;
              color: var(--primary);
              font-size: 13px;
              text-decoration: none;
              margin-top: 20px;
              justify-content: center;
            }

            .api-link:hover {
              text-decoration: underline;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
