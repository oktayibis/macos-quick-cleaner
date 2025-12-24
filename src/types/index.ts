// TypeScript types for the application

// Cache types
export type CacheType =
  | "Browser"
  | "System"
  | "Application"
  | "Developer"
  | "Unknown";

export interface CacheEntry {
  path: string;
  name: string;
  size: number;
  cache_type: CacheType;
  is_developer_related: boolean;
  is_safe_to_delete: boolean;
  description: string;
}

// Developer cache types
export interface DeveloperCache {
  name: string;
  path: string;
  size: number;
  description: string;
  exists: boolean;
  safe_to_clean: boolean;
}

// App types
export interface InstalledApp {
  name: string;
  bundle_id: string;
  path: string;
}

export type OrphanType =
  | "ApplicationSupport"
  | "Preferences"
  | "Containers"
  | "Caches"
  | "Logs"
  | "Other";

export interface OrphanFile {
  path: string;
  name: string;
  size: number;
  orphan_type: OrphanType;
  possible_app_name: string;
}

export interface LargeAppData {
  path: string;
  name: string;
  size: number;
  location: string; // "ApplicationSupport" | "Containers" | "Caches"
}

// Large file types
export type FileCategory =
  | "Video"
  | "Image"
  | "Audio"
  | "Archive"
  | "Document"
  | "Application"
  | "DiskImage"
  | "Other";

export interface LargeFile {
  path: string;
  name: string;
  size: number;
  category: FileCategory;
  last_modified: number | null;
  extension: string;
}

// Duplicate types
export interface DuplicateFile {
  path: string;
  name: string;
}

export interface DuplicateGroup {
  hash: string;
  files: DuplicateFile[];
  file_size: number;
  total_wasted: number;
}

// System info types
export interface DiskUsage {
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  used_percentage: number;
}

export interface SystemInfo {
  os_version: string;
  hostname: string;
  username: string;
  home_directory: string;
  disk_usage: DiskUsage;
}

// Navigation
export type NavSection =
  | "dashboard"
  | "cache"
  | "developer"
  | "leftovers"
  | "large-files"
  | "duplicates";

// Scan state
export interface ScanState {
  isScanning: boolean;
  progress: number;
  currentItem: string;
}
