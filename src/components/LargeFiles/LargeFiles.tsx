import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes, getCategoryClass } from '../../hooks/useFormatters';
import { FileVideo, RefreshCw, Trash2, File, Image, Music, Archive, FileText, Check, Square, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';

export function LargeFiles() {
  const { largeFiles, isLoadingLargeFiles, scanLargeFiles, deleteFile } = useAppStore();
  const [minSizeMb, setMinSizeMb] = useState(100);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Progress state
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '' });
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'selected' | 'all';
    path?: string;
  }>({ isOpen: false, type: 'single' });

  const totalSize = largeFiles.reduce((sum, f) => sum + f.size, 0);
  const selectedSize = largeFiles.filter(f => selectedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);

  const toggleSelection = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedPaths(newSelected);
  };

  const selectAll = () => {
    setSelectedPaths(new Set(largeFiles.map(f => f.path)));
  };

  const deselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleDeleteSingle = (path: string) => {
    setConfirmDialog({ isOpen: true, type: 'single', path });
  };

  const handleDeleteSelected = () => {
    if (selectedPaths.size === 0) return;
    setConfirmDialog({ isOpen: true, type: 'selected' });
  };

  const handleDeleteAll = () => {
    if (largeFiles.length === 0) return;
    setConfirmDialog({ isOpen: true, type: 'all' });
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const file = largeFiles.find(f => f.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: file?.name || '' });
      await deleteFile(confirmDialog.path);
      selectedPaths.delete(confirmDialog.path);
      setSelectedPaths(new Set(selectedPaths));
    } else if (confirmDialog.type === 'selected') {
      const paths = Array.from(selectedPaths);
      setProgress({ current: 0, total: paths.length, item: '' });
      for (let i = 0; i < paths.length; i++) {
        const file = largeFiles.find(f => f.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: file?.name || paths[i] });
        await deleteFile(paths[i]);
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      setProgress({ current: 0, total: largeFiles.length, item: '' });
      for (let i = 0; i < largeFiles.length; i++) {
        setProgress({ current: i, total: largeFiles.length, item: largeFiles[i].name });
        await deleteFile(largeFiles[i].path);
      }
      setSelectedPaths(new Set());
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const file = largeFiles.find(f => f.path === confirmDialog.path);
      return {
        title: 'Move to Trash?',
        message: `Are you sure you want to move "${file?.name}" to Trash?`,
        itemCount: 1,
        totalSize: formatBytes(file?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Move Selected to Trash?',
        message: 'Are you sure you want to move all selected files to Trash?',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Move All to Trash?',
        message: 'Are you sure you want to move ALL large files to Trash? This is a significant action.',
        itemCount: largeFiles.length,
        totalSize: formatBytes(totalSize),
      };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Video': return <FileVideo size={20} color="#ef4444" />;
      case 'Image': return <Image size={20} color="#22c55e" />;
      case 'Audio': return <Music size={20} color="#f59e0b" />;
      case 'Archive': return <Archive size={20} color="#6366f1" />;
      case 'Document': return <FileText size={20} color="#3b82f6" />;
      default: return <File size={20} />;
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Large Files</h1>
        <p className="page-subtitle">Find and remove large files taking up disk space</p>
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon large">
            <FileVideo size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Large Files Found</div>
          </div>
        </div>
        {selectedPaths.size > 0 && (
          <div className="stat-card" style={{ borderColor: 'var(--color-accent)' }}>
            <div className="stat-icon cache">
              <CheckSquare size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatBytes(selectedSize)}</div>
              <div className="stat-label">{selectedPaths.size} Selected</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-primary ${isLoadingLargeFiles ? 'loading' : ''}`}
          onClick={() => scanLargeFiles(minSizeMb)}
          disabled={isLoadingLargeFiles || isDeleting}
        >
          <RefreshCw size={18} className={isLoadingLargeFiles ? 'spinner' : ''} />
          {isLoadingLargeFiles ? 'Scanning...' : 'Scan Large Files'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Min size:
          </label>
          <select
            value={minSizeMb}
            onChange={(e) => setMinSizeMb(Number(e.target.value))}
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
            }}
          >
            <option value={10}>10 MB</option>
            <option value={50}>50 MB</option>
            <option value={100}>100 MB</option>
            <option value={500}>500 MB</option>
            <option value={1000}>1 GB</option>
          </select>
        </div>
        
        {largeFiles.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={selectedPaths.size === largeFiles.length ? deselectAll : selectAll}
              disabled={isDeleting}
            >
              {selectedPaths.size === largeFiles.length ? (
                <><Square size={18} /> Deselect All</>
              ) : (
                <><CheckSquare size={18} /> Select All</>
              )}
            </button>
            
            {selectedPaths.size > 0 && (
              <button
                className={`btn btn-danger ${isDeleting ? 'loading' : ''}`}
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 size={18} />
                Delete Selected ({selectedPaths.size})
              </button>
            )}
            
            <button
              className={`btn btn-danger ${isDeleting ? 'loading' : ''}`}
              onClick={handleDeleteAll}
              disabled={isDeleting}
            >
              <Trash2 size={18} />
              Delete All ({formatBytes(totalSize)})
            </button>
          </>
        )}
      </div>

      {/* File list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Large Files ({largeFiles.length})</h3>
        </div>

        {largeFiles.length === 0 ? (
          <div className="empty-state">
            <FileVideo size={48} className="empty-state-icon" />
            <p className="empty-state-title">No large files scanned yet</p>
            <p>Click "Scan Large Files" to find files larger than {minSizeMb} MB</p>
          </div>
        ) : (
          <div className="list">
            {largeFiles.map((file) => (
              <div key={file.path} className="list-item">
                <div
                  className={`checkbox ${selectedPaths.has(file.path) ? 'checked' : ''}`}
                  onClick={() => toggleSelection(file.path)}
                >
                  {selectedPaths.has(file.path) && <Check size={14} color="white" />}
                </div>
                <div className="list-item-icon">
                  {getCategoryIcon(file.category)}
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{file.name}</div>
                  <div className="list-item-subtitle" style={{ fontSize: '0.75rem' }}>
                    {file.path}
                  </div>
                </div>
                <span className={`badge ${getCategoryClass(file.category)}`}>
                  {file.category}
                </span>
                <div className="list-item-size">{formatBytes(file.size)}</div>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDeleteSingle(file.path)}
                  title="Move to Trash"
                  disabled={isDeleting}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={executeDelete}
        confirmText="Move to Trash"
        {...getDialogProps()}
      />

      {/* Progress Overlay */}
      <ProgressOverlay
        isVisible={isDeleting}
        currentItem={progress.item}
        currentIndex={progress.current}
        totalItems={progress.total}
        action="Moving to Trash"
      />
    </div>
  );
}
