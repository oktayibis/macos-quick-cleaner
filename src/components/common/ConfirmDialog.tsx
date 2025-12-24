import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemCount?: number;
  totalSize?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  itemCount,
  totalSize,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  isDangerous = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '420px',
              zIndex: 1001,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: isDangerous ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={28} color={isDangerous ? '#ef4444' : '#6366f1'} />
            </div>

            {/* Title */}
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              marginBottom: '8px',
              color: 'var(--color-text-primary)',
            }}>
              {title}
            </h2>

            {/* Message */}
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: '16px',
              lineHeight: 1.5,
            }}>
              {message}
            </p>

            {/* Stats */}
            {(itemCount !== undefined || totalSize) && (
              <div
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '24px',
                }}
              >
                {itemCount !== undefined && (
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{itemCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      {itemCount === 1 ? 'Item' : 'Items'}
                    </div>
                  </div>
                )}
                {totalSize && (
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totalSize}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      Will be freed
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onCancel}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
                style={{ flex: 1 }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
