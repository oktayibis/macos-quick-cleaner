import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import { Copy, RefreshCw, Trash2, File, ChevronDown, ChevronUp, Check, Square, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProgressOverlay } from '../common/ProgressOverlay';

export function Duplicates() {
  const { duplicates, isLoadingDuplicates, scanDuplicates, deleteDuplicate, addToast } = useAppStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [minSizeMb, setMinSizeMb] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '' });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'selected' | 'all';
    path?: string;
  }>({ isOpen: false, type: 'single' });

  const totalWasted = duplicates.reduce((sum, d) => sum + d.total_wasted, 0);
  const allDuplicateFiles = duplicates.flatMap(group => group.files.slice(1).map(f => f.path));
  const selectedSize = duplicates.flatMap(g => g.files.slice(1)).filter(f => selectedPaths.has(f.path))
    .reduce((sum, f) => {
      const group = duplicates.find(g => g.files.some(gf => gf.path === f.path));
      return sum + (group?.file_size || 0);
    }, 0);

  const toggleGroup = (hash: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(hash)) newExpanded.delete(hash);
    else newExpanded.add(hash);
    setExpandedGroups(newExpanded);
  };

  const toggleSelection = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) newSelected.delete(path);
    else newSelected.add(path);
    setSelectedPaths(newSelected);
  };

  const selectAllDuplicates = () => {
    setSelectedPaths(new Set(allDuplicateFiles));
    setExpandedGroups(new Set(duplicates.map(d => d.hash)));
  };

  const handleDeleteSingle = (path: string) => setConfirmDialog({ isOpen: true, type: 'single', path });
  const handleDeleteSelected = () => { if (selectedPaths.size > 0) setConfirmDialog({ isOpen: true, type: 'selected' }); };
  const handleDeleteAll = () => { if (allDuplicateFiles.length > 0) setConfirmDialog({ isOpen: true, type: 'all' }); };

  const executeDelete = async () => {
    setIsDeleting(true);
    let successCount = 0, failCount = 0;
    
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const file = duplicates.flatMap(g => g.files).find(f => f.path === confirmDialog.path);
      setProgress({ current: 0, total: 1, item: file?.name || '' });
      if (await deleteDuplicate(confirmDialog.path)) successCount++; else failCount++;
    } else if (confirmDialog.type === 'selected') {
      const paths = Array.from(selectedPaths);
      for (let i = 0; i < paths.length; i++) {
        const file = duplicates.flatMap(g => g.files).find(f => f.path === paths[i]);
        setProgress({ current: i, total: paths.length, item: file?.name || '' });
        if (await deleteDuplicate(paths[i])) successCount++; else failCount++;
      }
    } else if (confirmDialog.type === 'all') {
      for (let i = 0; i < allDuplicateFiles.length; i++) {
        const file = duplicates.flatMap(g => g.files).find(f => f.path === allDuplicateFiles[i]);
        setProgress({ current: i, total: allDuplicateFiles.length, item: file?.name || '' });
        if (await deleteDuplicate(allDuplicateFiles[i])) successCount++; else failCount++;
      }
    }
    setSelectedPaths(new Set());
    if (successCount > 0 && failCount === 0) addToast('success', 'Delete Complete', `Deleted ${successCount} duplicates`);
    else if (failCount > 0 && successCount > 0) addToast('warning', 'Partial Delete', `Deleted ${successCount}, failed ${failCount}`);
    setProgress({ current: 0, total: 0, item: '' });
    setIsDeleting(false);
  };

  const getDialogProps = () => {
    if (confirmDialog.type === 'single' && confirmDialog.path) {
      const group = duplicates.find(g => g.files.some(f => f.path === confirmDialog.path));
      const file = group?.files.find(f => f.path === confirmDialog.path);
      return { title: 'Delete Duplicate?', message: `Delete "${file?.name}"?`, itemCount: 1, totalSize: formatBytes(group?.file_size || 0) };
    } else if (confirmDialog.type === 'selected') {
      return { title: 'Delete Selected?', message: 'Delete all selected duplicates?', itemCount: selectedPaths.size, totalSize: formatBytes(selectedSize) };
    }
    return { title: 'Delete All Duplicates?', message: 'Delete ALL duplicates? One copy of each will be kept.', itemCount: allDuplicateFiles.length, totalSize: formatBytes(totalWasted) };
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Duplicate Files</h1>
        <p className="page-subtitle">Find and remove duplicate files to save space</p>
      </header>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon duplicate"><Copy size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalWasted)}</div>
            <div className="stat-label">Wasted Space</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cache"><File size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{duplicates.length}</div>
            <div className="stat-label">Duplicate Groups</div>
          </div>
        </div>
        {selectedPaths.size > 0 && (
          <div className="stat-card" style={{ borderColor: 'var(--color-accent)' }}>
            <div className="stat-icon cache"><CheckSquare size={24} /></div>
            <div className="stat-content">
              <div className="stat-value">{formatBytes(selectedSize)}</div>
              <div className="stat-label">{selectedPaths.size} Selected</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`btn btn-primary ${isLoadingDuplicates ? 'loading' : ''}`} onClick={() => scanDuplicates(minSizeMb)} disabled={isLoadingDuplicates || isDeleting}>
          <RefreshCw size={18} className={isLoadingDuplicates ? 'spinner' : ''} />
          {isLoadingDuplicates ? 'Scanning...' : 'Scan for Duplicates'}
        </button>
        <select value={minSizeMb} onChange={(e) => setMinSizeMb(Number(e.target.value))} style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-glass-border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--color-text-primary)' }}>
          <option value={1}>1 MB</option><option value={5}>5 MB</option><option value={10}>10 MB</option>
        </select>
        {allDuplicateFiles.length > 0 && (
          <>
            <button className="btn btn-secondary" onClick={selectedPaths.size === allDuplicateFiles.length ? () => setSelectedPaths(new Set()) : selectAllDuplicates} disabled={isDeleting}>
              {selectedPaths.size === allDuplicateFiles.length ? <><Square size={18} /> Deselect</> : <><CheckSquare size={18} /> Select All</>}
            </button>
            {selectedPaths.size > 0 && <button className="btn btn-danger" onClick={handleDeleteSelected} disabled={isDeleting}><Trash2 size={18} /> Delete Selected</button>}
            <button className="btn btn-danger" onClick={handleDeleteAll} disabled={isDeleting}><Trash2 size={18} /> Delete All ({formatBytes(totalWasted)})</button>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Duplicate Groups ({duplicates.length})</h3></div>
        {duplicates.length === 0 ? (
          <div className="empty-state"><Copy size={48} className="empty-state-icon" /><p className="empty-state-title">No duplicates scanned yet</p></div>
        ) : (
          <div className="list" style={{ gap: '16px' }}>
            {duplicates.map((group) => (
              <div key={group.hash} style={{ background: 'var(--color-bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
                <div className="list-item" style={{ cursor: 'pointer', background: 'transparent' }} onClick={() => toggleGroup(group.hash)}>
                  <div className="list-item-icon"><Copy size={20} /></div>
                  <div className="list-item-content">
                    <div className="list-item-title">{group.files.length} duplicate files</div>
                    <div className="list-item-subtitle">{formatBytes(group.file_size)} each • {formatBytes(group.total_wasted)} wasted</div>
                  </div>
                  <span className="badge badge-video">{group.files.length} copies</span>
                  {expandedGroups.has(group.hash) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedGroups.has(group.hash) && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {group.files.map((file, index) => (
                      <div key={file.path} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginTop: index ? '8px' : 0 }}>
                        {index > 0 && <div className={`checkbox ${selectedPaths.has(file.path) ? 'checked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleSelection(file.path); }}>{selectedPaths.has(file.path) && <Check size={14} color="white" />}</div>}
                        <File size={16} style={{ opacity: 0.5 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{file.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</div>
                        </div>
                        {index > 0 ? <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteSingle(file.path); }} disabled={isDeleting}><Trash2 size={14} /> Delete</button> : <span className="badge badge-image">Keep</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog isOpen={confirmDialog.isOpen} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={executeDelete} {...getDialogProps()} />
      <ProgressOverlay isVisible={isDeleting} currentItem={progress.item} currentIndex={progress.current} totalItems={progress.total} action="Deleting" />
    </div>
  );
}
