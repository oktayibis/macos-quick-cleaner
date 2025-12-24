import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { FolderX, RefreshCw, Trash2, Check, Square, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';

export function LeftoverFiles() {
  const { orphanFiles, isLoadingOrphans, scanOrphanFiles, deleteOrphan } = useAppStore();
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

  const totalSize = orphanFiles.reduce((sum, o) => sum + o.size, 0);
  const selectedSize = orphanFiles.filter(o => selectedPaths.has(o.path)).reduce((sum, o) => sum + o.size, 0);

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
    setSelectedPaths(new Set(orphanFiles.map(o => o.path)));
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
    if (orphanFiles.length === 0) return;
    setConfirmDialog({ isOpen: true, type: 'all' });
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const orphan = orphanFiles.find(o => o.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: orphan?.name || '' });
      await deleteOrphan(confirmDialog.path);
      selectedPaths.delete(confirmDialog.path);
      setSelectedPaths(new Set(selectedPaths));
    } else if (confirmDialog.type === 'selected') {
      const paths = Array.from(selectedPaths);
      setProgress({ current: 0, total: paths.length, item: '' });
      for (let i = 0; i < paths.length; i++) {
        const orphan = orphanFiles.find(o => o.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: orphan?.name || paths[i] });
        await deleteOrphan(paths[i]);
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      setProgress({ current: 0, total: orphanFiles.length, item: '' });
      for (let i = 0; i < orphanFiles.length; i++) {
        setProgress({ current: i, total: orphanFiles.length, item: orphanFiles[i].name });
        await deleteOrphan(orphanFiles[i].path);
      }
      setSelectedPaths(new Set());
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const orphan = orphanFiles.find(o => o.path === confirmDialog.path);
      return {
        title: 'Delete Leftover File?',
        message: `Are you sure you want to delete "${orphan?.name}"? This was left by "${orphan?.possible_app_name}".`,
        itemCount: 1,
        totalSize: formatBytes(orphan?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Delete Selected Leftovers?',
        message: 'Are you sure you want to delete all selected leftover files? This action cannot be undone.',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Delete All Leftovers?',
        message: 'Are you sure you want to delete all leftover files? This action cannot be undone.',
        itemCount: orphanFiles.length,
        totalSize: formatBytes(totalSize),
      };
    }
  };

  const getOrphanTypeLabel = (type: string) => {
    switch (type) {
      case 'ApplicationSupport': return 'App Support';
      case 'Preferences': return 'Preferences';
      case 'Containers': return 'Container';
      case 'Logs': return 'Logs';
      default: return 'Other';
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Leftover Files</h1>
        <p className="page-subtitle">Find files left behind by uninstalled applications</p>
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon leftover">
            <FolderX size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Orphan Files Found</div>
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
          className={`btn btn-primary ${isLoadingOrphans ? 'loading' : ''}`}
          onClick={scanOrphanFiles}
          disabled={isLoadingOrphans || isDeleting}
        >
          <RefreshCw size={18} className={isLoadingOrphans ? 'spinner' : ''} />
          {isLoadingOrphans ? 'Scanning...' : 'Scan for Leftovers'}
        </button>

        {orphanFiles.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={selectedPaths.size === orphanFiles.length ? deselectAll : selectAll}
              disabled={isDeleting}
            >
              {selectedPaths.size === orphanFiles.length ? (
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

      {/* Orphan list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Potential Leftover Files ({orphanFiles.length})</h3>
        </div>

        {orphanFiles.length === 0 ? (
          <div className="empty-state">
            <FolderX size={48} className="empty-state-icon" />
            <p className="empty-state-title">No leftover files scanned yet</p>
            <p>Click "Scan for Leftovers" to find orphaned application data</p>
          </div>
        ) : (
          <div className="list">
            {orphanFiles.map((orphan) => (
              <div key={orphan.path} className="list-item">
                <div
                  className={`checkbox ${selectedPaths.has(orphan.path) ? 'checked' : ''}`}
                  onClick={() => toggleSelection(orphan.path)}
                >
                  {selectedPaths.has(orphan.path) && <Check size={14} color="white" />}
                </div>
                <div className="list-item-icon">
                  <FolderX size={20} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{orphan.name}</div>
                  <div className="list-item-subtitle">
                    Possibly from: {orphan.possible_app_name}
                  </div>
                </div>
                <span className="badge badge-audio">{getOrphanTypeLabel(orphan.orphan_type)}</span>
                <div className="list-item-size">{formatBytes(orphan.size)}</div>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDeleteSingle(orphan.path)}
                  title="Delete orphan file"
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
