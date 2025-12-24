import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ProgressOverlayProps {
  isVisible: boolean;
  currentItem: string;
  currentIndex: number;
  totalItems: number;
  action?: string;
}

export function ProgressOverlay({
  isVisible,
  currentItem,
  currentIndex,
  totalItems,
  action = 'Deleting',
}: ProgressOverlayProps) {
  const progress = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Progress Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '20px',
                padding: '32px',
                width: '90%',
                maxWidth: '480px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Spinner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={48} color="var(--color-accent)" />
                </motion.div>
              </div>

              {/* Title */}
              <h2 style={{
                textAlign: 'center',
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--color-text-primary)',
              }}>
                {action}...
              </h2>

              {/* Counter */}
              <p style={{
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                marginBottom: '20px',
                fontSize: '0.875rem',
              }}>
                {currentIndex + 1} of {totalItems} items
              </p>

              {/* Progress bar */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: '10px',
                height: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-darker))',
                    borderRadius: '10px',
                  }}
                />
              </div>

              {/* Current item */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: '10px',
                padding: '12px 16px',
                overflow: 'hidden',
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)',
                  marginBottom: '4px',
                }}>
                  Current item:
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {currentItem || 'Processing...'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
