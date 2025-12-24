import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatBytes } from '../../hooks/useFormatters';
import {
  Database,
  Code2,
  FolderX,
  FileVideo,
  Copy,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const {
    systemInfo,
    loadSystemInfo,
    caches,
    scanCaches,
    isLoadingCaches,
    developerCaches,
    scanDeveloperCaches,
    isLoadingDeveloperCaches,
    orphanFiles,
    scanOrphanFiles,
    isLoadingOrphans,
    largeFiles,
    scanLargeFiles,
    isLoadingLargeFiles,
    duplicates,
    scanDuplicates,
    isLoadingDuplicates,
    setSection,
  } = useAppStore();

  useEffect(() => {
    loadSystemInfo();
  }, [loadSystemInfo]);

  const diskUsage = systemInfo?.disk_usage;
  const diskData = diskUsage
    ? [
        { name: 'Used', value: diskUsage.used_bytes },
        { name: 'Free', value: diskUsage.free_bytes },
      ]
    : [];

  const totalCacheSize = caches.reduce((sum, c) => sum + c.size, 0);
  const totalDevCacheSize = developerCaches.filter(d => d.exists).reduce((sum, c) => sum + c.size, 0);
  const totalOrphanSize = orphanFiles.reduce((sum, o) => sum + o.size, 0);
  const totalLargeFilesSize = largeFiles.reduce((sum, f) => sum + f.size, 0);
  const totalDuplicateWasted = duplicates.reduce((sum, d) => sum + d.total_wasted, 0);

  const handleQuickScan = async () => {
    await Promise.all([
      scanCaches(),
      scanDeveloperCaches(),
      scanOrphanFiles(),
      scanLargeFiles(100),
      scanDuplicates(1),
    ]);
  };

  const isScanning = isLoadingCaches || isLoadingDeveloperCaches || isLoadingOrphans || isLoadingLargeFiles || isLoadingDuplicates;

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of disk usage and cleanup opportunities</p>
      </header>

      {/* Disk Usage */}
      <div className="disk-usage">
        <div className="disk-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={diskData}
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill="#6366f1" />
                <Cell fill="#22222c" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <HardDrive size={20} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="disk-info">
          <h3 style={{ marginBottom: '8px' }}>Disk Storage</h3>
          {diskUsage ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatBytes(diskUsage.free_bytes)}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>
                  available of {formatBytes(diskUsage.total_bytes)}
                </span>
              </div>
              <div className="progress-bar" style={{ width: '300px' }}>
                <div
                  className={`progress-fill ${diskUsage.used_percentage > 90 ? 'danger' : diskUsage.used_percentage > 70 ? 'warning' : ''}`}
                  style={{ width: `${diskUsage.used_percentage}%` }}
                />
              </div>
            </>
          ) : (
            <p className="loading">Loading disk information...</p>
          )}
          <div className="disk-stats">
            <div className="disk-stat">
              <span className="disk-stat-dot used" />
              <span>Used: {diskUsage ? formatBytes(diskUsage.used_bytes) : '—'}</span>
            </div>
            <div className="disk-stat">
              <span className="disk-stat-dot free" />
              <span>Free: {diskUsage ? formatBytes(diskUsage.free_bytes) : '—'}</span>
            </div>
          </div>
        </div>
        <button
          className={`btn btn-primary scan-btn ${isScanning ? 'loading' : ''}`}
          onClick={handleQuickScan}
          disabled={isScanning}
        >
          <RefreshCw size={18} className={isScanning ? 'spinner' : ''} />
          {isScanning ? 'Scanning...' : 'Quick Scan'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setSection('cache')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon cache">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalCacheSize)}</div>
            <div className="stat-label">Cache Files</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setSection('developer')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon developer">
            <Code2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalDevCacheSize)}</div>
            <div className="stat-label">Developer Cache</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setSection('leftovers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon leftover">
            <FolderX size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalOrphanSize)}</div>
            <div className="stat-label">Leftover Files</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setSection('large-files')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon large">
            <FileVideo size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalLargeFilesSize)}</div>
            <div className="stat-label">Large Files</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setSection('duplicates')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon duplicate">
            <Copy size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(totalDuplicateWasted)}</div>
            <div className="stat-label">Duplicate Waste</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Cleanup Summary</h3>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          {caches.length > 0 || developerCaches.length > 0 || orphanFiles.length > 0 || largeFiles.length > 0 || duplicates.length > 0
            ? `Found potential savings of ${formatBytes(totalCacheSize + totalDevCacheSize + totalOrphanSize + totalDuplicateWasted)}`
            : 'Run a quick scan to find cleanup opportunities'}
        </p>
        {(caches.length > 0 || developerCaches.length > 0) && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-video">{caches.length} cache items</span>
            <span className="badge badge-image">{developerCaches.filter(d => d.exists).length} dev caches</span>
            <span className="badge badge-audio">{orphanFiles.length} orphan files</span>
            <span className="badge badge-archive">{largeFiles.length} large files</span>
            <span className="badge badge-document">{duplicates.length} duplicate groups</span>
          </div>
        )}
      </div>
    </div>
  );
}
