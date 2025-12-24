import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { FolderX, RefreshCw, Trash2, Check, Square, CheckSquare, FolderOpen } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';
import { invoke } from '@tauri-apps/api/core';

export function LargeFiles() {
  const { 
    largeAppData, isLoadingLargeAppData, scanLargeAppData, deleteLargeAppData,
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

  const totalSize = largeAppData.reduce((sum, item) => sum + item.size, 0);
  const selectedSize = largeAppData.filter(item => selectedPaths.has(item.path)).reduce((sum, item) => sum + item.size, 0);

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
    setSelectedPaths(new Set(largeAppData.map(item => item.path)));
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
    if (largeAppData.length === 0) return;
    setConfirmDialog({ isOpen: true, type: 'all' });
  };

  const handleOpenInFinder = async (path: string) => {
    try {
      await invoke('reveal_in_finder', { path });
      addToast('info', 'Opened in Finder', 'You can now delete this folder manually in Finder');
    } catch (error) {
      addToast('error', 'Failed to Open', String(error));
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const item = largeAppData.find(d => d.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: item?.name || '' });
      const success = await deleteLargeAppData(confirmDialog.path);
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
        const item = largeAppData.find(d => d.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: item?.name || paths[i] });
        const success = await deleteLargeAppData(paths[i]);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    } else if (confirmDialog.type === 'all') {
      const allItems = [...largeAppData];
      setProgress({ current: 0, total: allItems.length, item: '' });
      for (let i = 0; i < allItems.length; i++) {
        setProgress({ current: i, total: allItems.length, item: allItems[i].name });
        const success = await deleteLargeAppData(allItems[i].path);
        if (success) successCount++;
        else failCount++;
      }
      setSelectedPaths(new Set());
    }
    
    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      addToast('success', 'Delete Complete', `Successfully deleted ${successCount} folder${successCount > 1 ? 's' : ''}`);
    } else if (failCount > 0 && successCount > 0) {
      addToast('warning', 'Partial Delete', `Deleted ${successCount}, failed ${failCount}`);
    }
    
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const item = largeAppData.find(o => o.path === confirmDialog.path);
      return {
        title: 'Delete Large Folder?',
        message: `Are you sure you want to delete "${item?.name}"?`,
        itemCount: 1,
        totalSize: formatBytes(item?.size || 0),
      };
    } else if (confirmDialog.type === 'selected') {
      return {
        title: 'Delete Selected Folders?',
        message: 'Are you sure you want to delete all selected folders? This action cannot be undone.',
        itemCount: selectedPaths.size,
        totalSize: formatBytes(selectedSize),
      };
    } else {
      return {
        title: 'Delete All Large Folders?',
        message: 'Are you sure you want to delete all large folders? This action cannot be undone.',
        itemCount: largeAppData.length,
        totalSize: formatBytes(totalSize),
      };
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Large App Data</h1>
        <p className="page-subtitle">Find the largest application data folders sorted by size</p>
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon leftover">
            <FolderX size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Large Folders Found</div>
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
          className={`btn btn-primary ${isLoadingLargeAppData ? 'loading' : ''}`}
          onClick={scanLargeAppData}
          disabled={isLoadingLargeAppData || isDeleting}
        >
          <RefreshCw size={18} className={isLoadingLargeAppData ? 'spinner' : ''} />
          {isLoadingLargeAppData ? 'Scanning...' : 'Scan Large Folders'}
        </button>

        {largeAppData.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={selectedPaths.size === largeAppData.length ? deselectAll : selectAll}
              disabled={isDeleting}
            >
              {selectedPaths.size === largeAppData.length ? (
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
          <h3 className="card-title">Large App Folders ({largeAppData.length})</h3>
        </div>

        {largeAppData.length === 0 ? (
          <div className="empty-state">
            <FolderX size={48} className="empty-state-icon" />
            <p className="empty-state-title">No large folders scanned yet</p>
            <p>Click &quot;Scan Large Folders&quot; to find the biggest app data folders</p>
          </div>
        ) : (
          <div className="list">
            {largeAppData.map((item) => (
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
                    Location: {item.location}
                  </div>
                </div>
                <span className="badge badge-video">{item.location}</span>
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
        onClose={() => setConfirmDialog({ isOpen: false, type: 'single' })}
        onConfirm={() => {
          setConfirmDialog({ isOpen: false, type: 'single' });
          executeDelete();
        }}
        {...getDialogProps()}
      />

      {/* Progress Overlay */}
      {isDeleting && (
        <ProgressOverlay
          current={progress.current}
          total={progress.total}
          itemName={progress.item}
        />
      )}
    </div>
  );
}
