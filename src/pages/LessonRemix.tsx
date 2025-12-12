import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, Lightbulb, Gamepad2, Wand2, Copy, Check, Download, X, Image, FileText, ChevronDown } from 'lucide-react';
import { remixLesson, remixLessonFromImages, isConfigured } from '../services/gemini';
import { saveToHistory } from '../services/history';
import { exportRemixToPDF, exportRemixToPDFBW } from '../services/pdfExport';
import LoadingSpinner from '../components/LoadingSpinner';
import type { RemixedLesson, HistoryItem } from '../types';

type TabType = 'manual' | 'upload';

interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'pdf';
}

export default function LessonRemix() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  
  // Manual tab state
  const [originalLesson, setOriginalLesson] = useState('');
  
  // Upload tab state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [remixed, setRemixed] = useState<RemixedLesson | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load from history if navigated with state
  useEffect(() => {
    const state = location.state as { historyItem?: HistoryItem } | null;
    if (state?.historyItem?.type === 'remix') {
      setLoadedFromHistory(true);
      setRemixed(state.historyItem.data as RemixedLesson);
    }
  }, [location.state]);

  // Auto-save to history when remix is generated (skip if loaded from history)
  useEffect(() => {
    if (remixed && !loadedFromHistory) {
      saveToHistory(
        'remix',
        remixed.newTitle,
        `Remixed from: ${remixed.originalTitle}`,
        remixed
      );
    }
    if (loadedFromHistory) {
      setLoadedFromHistory(false);
    }
  }, [remixed]);

  const handleRemix = async () => {
    if (!originalLesson.trim()) {
      setError('Please paste your original lesson content');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await remixLesson(originalLesson);
      setRemixed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remix lesson');
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

  const handleRemixFromFiles = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one lesson file');
      return;
    }

    if (!isConfigured()) {
      setError('Please configure your Gemini API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const files = uploadedFiles.map(f => ({
        base64: f.base64,
        mimeType: f.mimeType
      }));
      const result = await remixLessonFromImages(files);
      setRemixed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remix lesson from files');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!remixed) return;
    navigator.clipboard.writeText(remixed.fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="page">
      <header className="page-header">
        <div className="page-icon animate-pulse">
          <Sparkles size={28} />
        </div>
        <div>
          <h1>Lesson Remix</h1>
          <p>Transform old lessons with fresh examples and engagement tricks</p>
        </div>
      </header>

      <div className="remix-grid">
        <div className="card input-card">
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
              Upload Files
            </button>
          </div>

          {activeTab === 'manual' && (
            <>
              <div className="card-header">
                <Upload size={20} />
                <h3>Original Lesson</h3>
              </div>
              <p className="card-desc">Paste your existing lesson content below</p>
              <textarea
                className="input textarea"
                placeholder="Paste your old lesson here...&#10;&#10;Example:&#10;Topic: Introduction to Fractions&#10;&#10;A fraction represents a part of a whole. The top number is called the numerator and the bottom number is called the denominator...&#10;&#10;Examples:&#10;1/2 = one half&#10;1/4 = one quarter&#10;&#10;Practice problems:&#10;1. What fraction of the pizza is left?&#10;2. Add 1/4 + 1/4"
                value={originalLesson}
                onChange={(e) => setOriginalLesson(e.target.value)}
                rows={16}
              />

              {error && <div className="error-message">{error}</div>}

              <button
                className="btn btn-primary remix-btn"
                onClick={handleRemix}
                disabled={loading}
              >
                <Wand2 size={20} />
                Remix This Lesson
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

              {error && <div className="error-message">{error}</div>}

              <button
                className="btn btn-primary remix-btn"
                onClick={handleRemixFromFiles}
                disabled={loading || uploadedFiles.length === 0}
              >
                <Wand2 size={20} />
                Remix from Files
              </button>
            </>
          )}
        </div>

        <div className="output-section">
          <AnimatePresence mode="wait">
            {loading && <LoadingSpinner message="Remixing your lesson with fresh ideas..." />}

            {!loading && !remixed && (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="empty-icon animate-float">
                  <Sparkles size={48} />
                </div>
                <h3>Ready to remix!</h3>
                <p>Paste your old lesson or upload files and watch it transform with new examples, activities, and engagement tricks</p>
                <div className="features-preview">
                  <div className="feature">
                    <Lightbulb size={20} />
                    <span>Fresh Examples</span>
                  </div>
                  <div className="feature">
                    <Gamepad2 size={20} />
                    <span>New Activities</span>
                  </div>
                  <div className="feature">
                    <Sparkles size={20} />
                    <span>Engagement Tricks</span>
                  </div>
                </div>
              </motion.div>
            )}


            {remixed && !loading && (
              <motion.div
                className="remixed-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="result-header">
                  <div>
                    <span className="result-label">Remixed</span>
                    <h2>{remixed.newTitle}</h2>
                    {remixed.originalTitle && (
                      <p className="original-title">Original: {remixed.originalTitle}</p>
                    )}
                  </div>
                  <div className="result-actions">
                    <button className="btn btn-secondary" onClick={copyToClipboard}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <div className="export-dropdown">
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                      >
                        <Download size={16} />
                        Export
                        <ChevronDown size={14} />
                      </button>
                      {showExportMenu && (
                        <div className="export-menu">
                          <button onClick={() => { exportRemixToPDF(remixed); setShowExportMenu(false); }}>
                            🎨 Color Version
                          </button>
                          <button onClick={() => { exportRemixToPDFBW(remixed); setShowExportMenu(false); }}>
                            ⬛ Black & White
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md-content">
                  <motion.section
                    className="md-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="md-section-header">
                      <Lightbulb size={18} />
                      <h3>## New Examples</h3>
                    </div>
                    <div className="md-list">
                      {remixed.newExamples.map((example, i) => (
                        <motion.div
                          key={i}
                          className="md-list-item examples"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                        >
                          <span className="md-bullet">•</span>
                          <span>{example}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>

                  <div className="md-divider" />

                  <motion.section
                    className="md-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="md-section-header">
                      <Gamepad2 size={18} />
                      <h3>## New Activities</h3>
                    </div>
                    <div className="md-list">
                      {remixed.newActivities.map((activity, i) => (
                        <motion.div
                          key={i}
                          className="md-list-item activities"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + i * 0.05 }}
                        >
                          <span className="md-number">{i + 1}.</span>
                          <span>{activity}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>

                  <div className="md-divider" />

                  <motion.section
                    className="md-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="md-section-header">
                      <Sparkles size={18} />
                      <h3>## Engagement Tricks</h3>
                    </div>
                    <div className="md-list">
                      {remixed.engagementTricks.map((trick, i) => (
                        <motion.div
                          key={i}
                          className="md-list-item tricks"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + i * 0.05 }}
                        >
                          <span className="md-bullet">✨</span>
                          <span>{trick}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>

                  <div className="md-divider" />

                  <motion.section
                    className="md-section full-lesson"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="md-section-header">
                      <FileText size={18} />
                      <h3>## Full Remixed Lesson</h3>
                    </div>
                    <div className="md-body">
                      {remixed.fullContent.split('\n').map((line, i) => {
                        if (!line.trim()) return <div key={i} className="md-spacer" />;
                        if (line.startsWith('# ')) return <h1 key={i} className="md-h1">{line.slice(2)}</h1>;
                        if (line.startsWith('## ')) return <h2 key={i} className="md-h2">{line.slice(3)}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} className="md-h3">{line.slice(4)}</h3>;
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <div key={i} className="md-body-list"><span className="md-bullet">•</span><span>{line.slice(2)}</span></div>;
                        }
                        if (/^\d+\.\s/.test(line)) {
                          const match = line.match(/^(\d+)\.\s(.*)$/);
                          if (match) return <div key={i} className="md-body-list"><span className="md-number">{match[1]}.</span><span>{match[2]}</span></div>;
                        }
                        if (line.startsWith('> ')) return <blockquote key={i} className="md-quote">{line.slice(2)}</blockquote>;
                        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="md-bold">{line.slice(2, -2)}</p>;
                        return <p key={i} className="md-paragraph">{line}</p>;
                      })}
                    </div>
                  </motion.section>
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

        .remix-grid { display: grid; grid-template-columns: 400px 1fr; gap: 24px; }
        @media (max-width: 900px) { .remix-grid { grid-template-columns: 1fr; } }

        .tabs {
          display: flex; gap: 8px; margin-bottom: 20px;
          border-bottom: 2px solid var(--gray-200); padding-bottom: 0;
        }
        .tab {
          padding: 10px 16px; background: none; border: none;
          font-size: 14px; font-weight: 500; color: var(--gray-500);
          cursor: pointer; position: relative; transition: color 0.2s;
        }
        .tab:hover { color: var(--gray-700); }
        .tab.active { color: var(--primary); }
        .tab.active::after {
          content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
          height: 2px; background: var(--primary); border-radius: 2px 2px 0 0;
        }

        .input-card { height: fit-content; }
        .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--gray-800); }
        .card-desc { color: var(--gray-500); font-size: 13px; margin-bottom: 16px; }
        .textarea { min-height: 300px; font-family: inherit; font-size: 14px; line-height: 1.6; }

        .upload-section { margin-bottom: 16px; }
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
          position: relative; width: 80px; display: flex; flex-direction: column;
        }
        .file-preview img { 
          width: 80px; height: 80px; object-fit: cover;
          border-radius: 10px; box-shadow: var(--shadow-sm);
        }
        .pdf-preview {
          width: 80px; height: 80px; background: var(--gray-100);
          border-radius: 10px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px;
          color: var(--gray-500); box-shadow: var(--shadow-sm);
        }
        .pdf-preview span { font-size: 11px; font-weight: 500; }
        .file-name {
          font-size: 10px; color: var(--gray-500); margin-top: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 80px;
        }
        .remove-file {
          position: absolute; top: 4px; right: 4px;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(0,0,0,0.6); color: white; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .remove-file:hover { background: rgba(220,38,38,0.9); }

        .add-more-files {
          width: 80px; height: 80px; border: 2px dashed var(--gray-300);
          border-radius: 10px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px;
          cursor: pointer; transition: all 0.2s; color: var(--gray-400);
        }
        .add-more-files:hover { border-color: var(--primary); color: var(--primary); }
        .add-more-files span { font-size: 11px; }

        .error-message {
          margin: 16px 0; padding: 12px 16px;
          background: rgb(239 68 68 / 0.1); color: #dc2626; border-radius: 12px;
        }

        .remix-btn { width: 100%; padding: 14px; margin-top: 16px; }

        .empty-state {
          background: white; border-radius: 16px; padding: 60px 40px;
          text-align: center; box-shadow: var(--shadow-md);
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 500px;
        }
        .empty-icon {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          color: white; margin-bottom: 20px;
        }
        .empty-state h3 { color: var(--gray-700); margin-bottom: 8px; font-size: 20px; }
        .empty-state p { color: var(--gray-500); font-size: 14px; max-width: 300px; margin-bottom: 24px; }

        .features-preview { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
        .feature {
          display: flex; align-items: center; gap: 8px;
          color: var(--primary); font-size: 14px; font-weight: 500;
        }

        .remixed-result {
          background: white; border-radius: 16px; padding: 28px;
          box-shadow: var(--shadow-md);
        }
        .result-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
          padding-bottom: 20px; border-bottom: 1px solid var(--gray-200);
        }
        .result-label {
          display: inline-block; padding: 4px 10px;
          background: rgb(124 58 237 / 0.1); color: var(--primary);
          border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 8px;
        }
        .result-header h2 { font-size: 24px; color: var(--gray-800); font-weight: 700; }
        .original-title { font-size: 13px; color: var(--gray-500); margin-top: 4px; }
        .result-actions { display: flex; gap: 8px; }

        .export-dropdown { position: relative; }
        .export-dropdown .btn { display: flex; align-items: center; gap: 6px; }
        .export-menu {
          position: absolute; top: 100%; right: 0; margin-top: 8px;
          background: white; border-radius: 12px; box-shadow: var(--shadow-lg);
          overflow: hidden; z-index: 100; min-width: 160px;
        }
        .export-menu button {
          width: 100%; padding: 12px 16px; border: none; background: none;
          text-align: left; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; gap: 8px; transition: background 0.2s;
        }
        .export-menu button:hover { background: var(--gray-100); }

        .md-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        
        .md-section { margin-bottom: 8px; }
        .md-section-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px;
        }
        .md-section-header svg { color: var(--primary); }
        .md-section-header h3 {
          font-size: 16px; font-weight: 600; color: var(--gray-800);
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .md-list { display: flex; flex-direction: column; gap: 10px; padding-left: 8px; }
        .md-list-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 16px; background: var(--gray-50); border-radius: 10px;
          font-size: 14px; color: var(--gray-700); line-height: 1.6;
          border-left: 3px solid var(--primary);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .md-list-item:hover { transform: translateX(4px); box-shadow: var(--shadow-sm); }
        .md-list-item.examples { border-left-color: #8b5cf6; }
        .md-list-item.activities { border-left-color: #22c55e; background: rgb(34 197 94 / 0.05); }
        .md-list-item.tricks { border-left-color: #f59e0b; background: rgb(245 158 11 / 0.05); }
        
        .md-bullet { color: var(--primary); font-weight: 700; flex-shrink: 0; }
        .md-number { 
          color: var(--primary); font-weight: 700; flex-shrink: 0;
          min-width: 20px; font-family: 'SF Mono', monospace;
        }

        .md-divider {
          height: 1px; background: linear-gradient(90deg, transparent, var(--gray-200), transparent);
          margin: 24px 0;
        }

        .md-section.full-lesson { margin-top: 8px; }
        .md-body {
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          border-radius: 12px; padding: 24px;
          max-height: 500px; overflow-y: auto;
          border: 1px solid var(--gray-200);
        }
        .md-spacer { height: 12px; }
        .md-h1 {
          font-size: 22px; font-weight: 700; color: var(--gray-900);
          margin-bottom: 16px; padding-bottom: 8px;
          border-bottom: 2px solid var(--primary);
        }
        .md-h2 {
          font-size: 18px; font-weight: 600; color: var(--gray-800);
          margin: 20px 0 12px; padding-bottom: 6px;
          border-bottom: 1px solid var(--gray-300);
        }
        .md-h3 {
          font-size: 15px; font-weight: 600; color: var(--gray-700);
          margin: 16px 0 10px;
        }
        .md-paragraph {
          font-size: 14px; color: var(--gray-700); line-height: 1.8;
          margin-bottom: 10px;
        }
        .md-bold { font-weight: 600; color: var(--gray-800); margin-bottom: 10px; }
        .md-body-list {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: var(--gray-700); line-height: 1.7;
          margin-bottom: 8px; padding-left: 8px;
        }
        .md-quote {
          border-left: 4px solid var(--primary); padding: 12px 16px;
          background: rgb(124 58 237 / 0.05); border-radius: 0 8px 8px 0;
          font-style: italic; color: var(--gray-600); margin: 12px 0;
        }
      `}</style>
    </div>
  );
}
