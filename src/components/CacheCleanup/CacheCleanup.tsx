import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { Database, RefreshCw, Trash2, AlertCircle, CheckCircle, Check, Square, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';

export function CacheCleanup() {
  const { caches, isLoadingCaches, scanCaches, deleteCache, addToast } = useAppStore();
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

  const safeCaches = caches.filter(c => c.is_safe_to_delete);
  const totalSize = caches.reduce((sum, c) => sum + c.size, 0);
  const safeToDeleteSize = safeCaches.reduce((sum, c) => sum + c.size, 0);
  const selectedSize = caches.filter(c => selectedPaths.has(c.path)).reduce((sum, c) => sum + c.size, 0);

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
      const cache = caches.find(c => c.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: cache?.name || '' });
      const success = await deleteCache(confirmDialog.path);
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
        const cache = caches.find(c => c.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: cache?.name || paths[i] });
        const success = await deleteCache(paths[i]);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      setProgress({ current: 0, total: safeCaches.length, item: '' });
      for (let i = 0; i < safeCaches.length; i++) {
        setProgress({ current: i, total: safeCaches.length, item: safeCaches[i].name });
        const success = await deleteCache(safeCaches[i].path);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    }
    
    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      addToast('success', 'Delete Complete', `Successfully deleted ${successCount} cache${successCount > 1 ? 's' : ''}`);
    } else if (failCount > 0 && successCount > 0) {
      addToast('warning', 'Partial Delete', `Deleted ${successCount}, failed ${failCount}`);
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const cache = caches.find(c => c.path === confirmDialog.path);
      return {
        title: 'Delete Cache?',
        message: `Are you sure you want to delete "${cache?.name}"? This action cannot be undone.`,
        itemCount: 1,
        totalSize: formatBytes(cache?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Delete Selected Caches?',
        message: 'Are you sure you want to delete all selected cache items? This action cannot be undone.',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Delete All Safe Caches?',
        message: 'Are you sure you want to delete all safe-to-delete caches? This action cannot be undone.',
        itemCount: safeCaches.length,
        totalSize: formatBytes(safeToDeleteSize),
      };
    }
  };

  const getCacheTypeColor = (type: string) => {
    switch (type) {
      case 'Browser': return 'badge-video';
      case 'Developer': return 'badge-image';
      case 'System': return 'badge-audio';
      case 'Application': return 'badge-archive';
      default: return 'badge-other';
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Cache Cleanup</h1>
        <p className="page-subtitle">Clean up cached files to free disk space</p>
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon cache">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Total Cache Size</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon developer">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(safeToDeleteSize)}</div>
            <div className="stat-label">Safe to Delete</div>
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
          className={`btn btn-primary ${isLoadingCaches ? 'loading' : ''}`}
          onClick={scanCaches}
          disabled={isLoadingCaches || isDeleting}
        >
          <RefreshCw size={18} className={isLoadingCaches ? 'spinner' : ''} />
          {isLoadingCaches ? 'Scanning...' : 'Scan Caches'}
        </button>
        
        {safeCaches.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={selectedPaths.size === safeCaches.length ? deselectAll : selectAll}
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
              Delete All Safe ({formatBytes(safeToDeleteSize)})
            </button>
          </>
        )}
      </div>

      {/* Cache list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Found Caches ({caches.length})</h3>
        </div>

        {caches.length === 0 ? (
          <div className="empty-state">
            <Database size={48} className="empty-state-icon" />
            <p className="empty-state-title">No caches scanned yet</p>
            <p>Click &quot;Scan Caches&quot; to find cached files</p>
          </div>
        ) : (
          <div className="list">
            {caches.map((cache) => (
              <div key={cache.path} className="list-item">
                {cache.is_safe_to_delete && (
                  <div
                    className={`checkbox ${selectedPaths.has(cache.path) ? 'checked' : ''}`}
                    onClick={() => toggleSelection(cache.path)}
                  >
                    {selectedPaths.has(cache.path) && <Check size={14} color="white" />}
                  </div>
                )}
                <div className="list-item-icon">
                  <Database size={20} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{cache.name}</div>
                  <div className="list-item-subtitle">
                    {cache.description}
                    {cache.is_developer_related && ' • Developer related'}
                  </div>
                </div>
                <span className={`badge ${getCacheTypeColor(cache.cache_type)}`}>
                  {cache.cache_type}
                </span>
                <div className="list-item-size">{formatBytes(cache.size)}</div>
                {cache.is_safe_to_delete ? (
                  <button
                    className="btn btn-icon btn-danger"
                    onClick={() => handleDeleteSingle(cache.path)}
                    title="Delete cache"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <button className="btn btn-icon btn-secondary" disabled title="System cache - not recommended">
                    <AlertCircle size={16} />
                  </button>
                )}
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
        {...getDialogProps()}
      />

      {/* Progress Overlay */}
      <ProgressOverlay
        isVisible={isDeleting}
        currentItem={progress.item}
        currentIndex={progress.current}
        totalItems={progress.total}
        action="Deleting"
      />
    </div>
  );
}
