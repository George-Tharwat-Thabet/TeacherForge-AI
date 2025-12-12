import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = 'Generating with AI...' }: Props) {
  return (
    <motion.div
      className="loading-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loading-content">
        <motion.div
          className="loading-icon"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={32} />
        </motion.div>
        <p>{message}</p>
        <div className="loading-dots">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .loading-content {
          text-align: center;
        }

        .loading-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 20px;
          box-shadow: 0 10px 30px rgb(124 58 237 / 0.3);
        }

        .loading-content p {
          color: var(--gray-600);
          font-weight: 500;
          margin-bottom: 16px;
        }

        .loading-dots {
          display: flex;
          gap: 6px;
          justify-content: center;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: var(--primary);
          border-radius: 50%;
        }
      `}</style>
    </motion.div>
  );
}
