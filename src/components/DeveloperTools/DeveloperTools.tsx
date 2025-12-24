import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { Code2, RefreshCw, Trash2, AlertTriangle, CheckCircle, Check, Square, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';

export function DeveloperTools() {
  const {
    developerCaches,
    isLoadingDeveloperCaches,
    isDeveloper,
    scanDeveloperCaches,
    cleanDeveloperCache,
    addToast,
  } = useAppStore();
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

  const existingCaches = developerCaches.filter((c) => c.exists);
  const safeCaches = existingCaches.filter((c) => c.safe_to_clean);
  const totalSize = existingCaches.reduce((sum, c) => sum + c.size, 0);
  const safeSize = safeCaches.reduce((sum, c) => sum + c.size, 0);
  const selectedSize = existingCaches.filter(c => selectedPaths.has(c.path)).reduce((sum, c) => sum + c.size, 0);

  const toggleSelection = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedPaths(newSelected);
  };

  const selectAllSafe = () => {
    setSelectedPaths(new Set(safeCaches.map(c => c.path)));
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
    if (safeCaches.length === 0) return;
    setConfirmDialog({ isOpen: true, type: 'all' });
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const cache = existingCaches.find(c => c.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: cache?.name || '' });
      const success = await cleanDeveloperCache(confirmDialog.path);
      if (success) {
        successCount++;
        selectedPaths.delete(confirmDialog.path);
        setSelectedPaths(new Set(selectedPaths));
      } else {
        failCount++;
      }
    } else if (confirmDialog.type === 'selected') {
      const paths = Array.from(selectedPaths);
      setProgress({ current: 0, total: paths.length, item: '' });
      for (let i = 0; i < paths.length; i++) {
        const cache = existingCaches.find(c => c.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: cache?.name || paths[i] });
        const success = await cleanDeveloperCache(paths[i]);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      setProgress({ current: 0, total: safeCaches.length, item: '' });
      for (let i = 0; i < safeCaches.length; i++) {
        setProgress({ current: i, total: safeCaches.length, item: safeCaches[i].name });
        const success = await cleanDeveloperCache(safeCaches[i].path);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    }
    
    // Refresh the list
    await scanDeveloperCaches();
    
    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      addToast('success', 'Clean Complete', `Successfully cleaned ${successCount} cache${successCount > 1 ? 's' : ''}`);
    } else if (failCount > 0 && successCount > 0) {
      addToast('warning', 'Partial Clean', `Cleaned ${successCount}, failed ${failCount}`);
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const cache = existingCaches.find(c => c.path === confirmDialog.path);
      return {
        title: 'Clean Developer Cache?',
        message: `Are you sure you want to clean "${cache?.name}"? This will remove cached files but won't affect your projects.`,
        itemCount: 1,
        totalSize: formatBytes(cache?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Clean Selected Caches?',
        message: 'Are you sure you want to clean all selected developer caches?',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Clean All Safe Caches?',
        message: 'Are you sure you want to clean all safe-to-clean developer caches?',
        itemCount: safeCaches.length,
        totalSize: formatBytes(safeSize),
      };
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Developer Tools</h1>
        <p className="page-subtitle">Clean up development caches and build artifacts</p>
      </header>

      {/* Developer detection */}
      {isDeveloper && (
        <div className="card" style={{ marginBottom: '24px', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={24} color="#22c55e" />
            <div>
              <strong style={{ color: '#22c55e' }}>Developer Environment Detected</strong>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                We found development tools on your system. Clean caches safely to free up space.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon developer">
            <Code2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Total Dev Cache</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cache">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(safeSize)}</div>
            <div className="stat-label">Safe to Clean</div>
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-primary ${isLoadingDeveloperCaches ? 'loading' : ''}`}
          onClick={scanDeveloperCaches}
          disabled={isLoadingDeveloperCaches || isDeleting}
        >
          <RefreshCw size={18} className={isLoadingDeveloperCaches ? 'spinner' : ''} />
          {isLoadingDeveloperCaches ? 'Scanning...' : 'Scan Developer Caches'}
        </button>

        {safeCaches.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={selectedPaths.size === safeCaches.length ? deselectAll : selectAllSafe}
              disabled={isDeleting}
            >
              {selectedPaths.size === safeCaches.length ? (
                <><Square size={18} /> Deselect All</>
              ) : (
                <><CheckSquare size={18} /> Select All Safe</>
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
              Clean All Safe ({formatBytes(safeSize)})
            </button>
          </>
        )}
      </div>

      {/* Cache list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Developer Caches ({existingCaches.length} found)</h3>
        </div>

        {existingCaches.length === 0 ? (
          <div className="empty-state">
            <Code2 size={48} className="empty-state-icon" />
            <p className="empty-state-title">No developer caches scanned yet</p>
            <p>Click &quot;Scan Developer Caches&quot; to find build artifacts and package caches</p>
          </div>
        ) : (
          <div className="list">
            {existingCaches.map((cache) => (
              <div key={cache.path} className="list-item">
                <div
                  className={`checkbox ${selectedPaths.has(cache.path) ? 'checked' : ''}`}
                  onClick={() => toggleSelection(cache.path)}
                >
                  {selectedPaths.has(cache.path) && <Check size={14} color="white" />}
                </div>
                <div className="list-item-icon" style={{ background: cache.safe_to_clean ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)' }}>
                  <Code2 size={20} color={cache.safe_to_clean ? '#22c55e' : '#f59e0b'} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{cache.name}</div>
                  <div className="list-item-subtitle">{cache.description}</div>
                </div>
                {!cache.safe_to_clean && (
                  <span className="badge badge-audio">
                    <AlertTriangle size={10} style={{ marginRight: '4px' }} />
                    Caution
                  </span>
                )}
                <div className="list-item-size">{formatBytes(cache.size)}</div>
                <button
                  className={`btn btn-icon ${cache.safe_to_clean ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => handleDeleteSingle(cache.path)}
                  title={cache.safe_to_clean ? 'Clean cache' : 'Clean with caution'}
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
        confirmText="Clean"
        {...getDialogProps()}
      />

      {/* Progress Overlay */}
      <ProgressOverlay
        isVisible={isDeleting}
        currentItem={progress.item}
        currentIndex={progress.current}
        totalItems={progress.total}
        action="Cleaning"
      />
    </div>
  );
}
