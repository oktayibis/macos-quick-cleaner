import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { FolderX, RefreshCw, Trash2, Check, Square, CheckSquare, FolderOpen } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';
import { invoke } from '@tauri-apps/api/core';

export function LeftoverFiles() {
  const { 
    orphanFiles, isLoadingOrphans, scanOrphanFiles, deleteOrphan,
    addToast 
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

  const totalSize = orphanFiles.reduce((sum, item) => sum + item.size, 0);
  const selectedSize = orphanFiles.filter(item => selectedPaths.has(item.path)).reduce((sum, item) => sum + item.size, 0);

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
    setSelectedPaths(new Set(orphanFiles.map(item => item.path)));
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

  const handleOpenInFinder = async (path: string) => {
    try {
      await invoke('reveal_in_finder', { path });
      addToast('info', 'Opened in Finder', 'You can now delete this file manually in Finder');
    } catch (error) {
      addToast('error', 'Failed to Open', String(error));
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const item = orphanFiles.find(d => d.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: item?.name || '' });
      const success = await deleteOrphan(confirmDialog.path);
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
        const item = orphanFiles.find(d => d.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: item?.name || paths[i] });
        const success = await deleteOrphan(paths[i]);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      const allItems = [...orphanFiles];
      setProgress({ current: 0, total: allItems.length, item: '' });
      for (let i = 0; i < allItems.length; i++) {
        setProgress({ current: i, total: allItems.length, item: allItems[i].name });
        const success = await deleteOrphan(allItems[i].path);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    }
    
    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      addToast('success', 'Delete Complete', `Successfully deleted ${successCount} file${successCount > 1 ? 's' : ''}`);
    } else if (failCount > 0 && successCount > 0) {
      addToast('warning', 'Partial Delete', `Deleted ${successCount}, failed ${failCount}`);
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const item = orphanFiles.find(o => o.path === confirmDialog.path);
      return {
        title: 'Delete Leftover File?',
        message: `Are you sure you want to delete "${item?.name}"? This was left by "${item?.possible_app_name}".`,
        itemCount: 1,
        totalSize: formatBytes(item?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Delete Selected Leftovers?',
        message: 'Are you sure you want to delete all selected items? This action cannot be undone.',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Delete All Leftovers?',
        message: 'Are you sure you want to delete all items? This action cannot be undone.',
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
      case 'Caches': return 'Caches';
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

      {/* List */}
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
            {orphanFiles.map((item) => (
              <div key={item.path} className="list-item">
                <div
                  className={`checkbox ${selectedPaths.has(item.path) ? 'checked' : ''}`}
                  onClick={() => toggleSelection(item.path)}
                >
                  {selectedPaths.has(item.path) && <Check size={14} color="white" />}
                </div>
                <div className="list-item-icon">
                  <FolderX size={20} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{item.name}</div>
                  <div className="list-item-subtitle">
                    Possibly from: {item.possible_app_name}
                  </div>
                </div>
                <span className="badge badge-audio">{getOrphanTypeLabel(item.orphan_type)}</span>
                <div className="list-item-size">{formatBytes(item.size)}</div>
                <button
                  className="btn btn-icon btn-secondary"
                  onClick={() => handleOpenInFinder(item.path)}
                  title="Open in Finder"
                  disabled={isDeleting}
                >
                  <FolderOpen size={16} />
                </button>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDeleteSingle(item.path)}
                  title="Delete"
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
