import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  CacheEntry,
  DeveloperCache,
  OrphanFile,
  LargeFile,
  DuplicateGroup,
  SystemInfo,
  NavSection,
} from "../types";
import type { Toast, ToastType } from "../components/common/Toast";

interface AppState {
  // Navigation
  currentSection: NavSection;
  setSection: (section: NavSection) => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message: string) => void;
  dismissToast: (id: string) => void;

  // System info
  systemInfo: SystemInfo | null;
  loadSystemInfo: () => Promise<void>;

  // Cache data
  caches: CacheEntry[];
  isLoadingCaches: boolean;
  scanCaches: () => Promise<void>;
  deleteCache: (path: string) => Promise<boolean>;

  // Developer cache data
  developerCaches: DeveloperCache[];
  isLoadingDeveloperCaches: boolean;
  isDeveloper: boolean;
  scanDeveloperCaches: () => Promise<void>;
  cleanDeveloperCache: (path: string) => Promise<boolean>;

  // Orphan files
  orphanFiles: OrphanFile[];
  isLoadingOrphans: boolean;
  scanOrphanFiles: () => Promise<void>;
  deleteOrphan: (path: string) => Promise<boolean>;

  // Large files
  largeFiles: LargeFile[];
  isLoadingLargeFiles: boolean;
  scanLargeFiles: (minSizeMb?: number) => Promise<void>;
  deleteFile: (path: string) => Promise<boolean>;

  // Duplicates
  duplicates: DuplicateGroup[];
  isLoadingDuplicates: boolean;
  scanDuplicates: (minSizeMb?: number) => Promise<void>;
  deleteDuplicate: (path: string) => Promise<boolean>;
}

let toastId = 0;

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentSection: "dashboard",
  setSection: (section) => set({ currentSection: section }),

  // Toasts
  toasts: [],
  addToast: (type, title, message) => {
    const id = `toast-${++toastId}`;
    const toast: Toast = { id, type, title, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().dismissToast(id);
    }, 5000);
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // System info
  systemInfo: null,
  loadSystemInfo: async () => {
    try {
      const info = await invoke<SystemInfo>("get_system_info");
      set({ systemInfo: info });
    } catch (error) {
      get().addToast("error", "Failed to load system info", String(error));
    }
  },

  // Cache
  caches: [],
  isLoadingCaches: false,
  scanCaches: async () => {
    set({ isLoadingCaches: true });
    try {
      const caches = await invoke<CacheEntry[]>("scan_all_caches");
      set({ caches });
      get().addToast(
        "success",
        "Scan Complete",
        `Found ${caches.length} cache items`
      );
    } catch (error) {
      get().addToast("error", "Scan Failed", String(error));
    } finally {
      set({ isLoadingCaches: false });
    }
  },
  deleteCache: async (path) => {
    try {
      await invoke("delete_cache", { path });
      set({ caches: get().caches.filter((c) => c.path !== path) });
      return true;
    } catch (error) {
      get().addToast("error", "Delete Failed", String(error));
      return false;
    }
  },

  // Developer caches
  developerCaches: [],
  isLoadingDeveloperCaches: false,
  isDeveloper: false,
  scanDeveloperCaches: async () => {
    set({ isLoadingDeveloperCaches: true });
    try {
      const isDeveloper = await invoke<boolean>("is_developer_user");
      const developerCaches = await invoke<DeveloperCache[]>(
        "scan_developer_caches"
      );
      set({ developerCaches, isDeveloper });
      const found = developerCaches.filter((c) => c.exists).length;
      get().addToast(
        "success",
        "Scan Complete",
        `Found ${found} developer caches`
      );
    } catch (error) {
      get().addToast("error", "Scan Failed", String(error));
    } finally {
      set({ isLoadingDeveloperCaches: false });
    }
  },
  cleanDeveloperCache: async (path) => {
    try {
      await invoke("clean_developer_cache", { path });
      return true;
    } catch (error) {
      get().addToast("error", "Clean Failed", String(error));
      return false;
    }
  },

  // Orphan files
  orphanFiles: [],
  isLoadingOrphans: false,
  scanOrphanFiles: async () => {
    set({ isLoadingOrphans: true });
    try {
      const orphanFiles = await invoke<OrphanFile[]>("scan_orphan_files");
      set({ orphanFiles });
      get().addToast(
        "success",
        "Scan Complete",
        `Found ${orphanFiles.length} leftover files`
      );
    } catch (error) {
      get().addToast("error", "Scan Failed", String(error));
    } finally {
      set({ isLoadingOrphans: false });
    }
  },
  deleteOrphan: async (path) => {
    try {
      await invoke("delete_orphan", { path });
      set({ orphanFiles: get().orphanFiles.filter((o) => o.path !== path) });
      return true;
    } catch (error) {
      get().addToast("error", "Delete Failed", String(error));
      return false;
    }
  },

  // Large files
  largeFiles: [],
  isLoadingLargeFiles: false,
  scanLargeFiles: async (minSizeMb = 100) => {
    set({ isLoadingLargeFiles: true });
    try {
      const largeFiles = await invoke<LargeFile[]>("scan_common_large_files", {
        minSizeMb,
      });
      set({ largeFiles });
      get().addToast(
        "success",
        "Scan Complete",
        `Found ${largeFiles.length} large files`
      );
    } catch (error) {
      get().addToast("error", "Scan Failed", String(error));
    } finally {
      set({ isLoadingLargeFiles: false });
    }
  },
  deleteFile: async (path) => {
    try {
      await invoke("move_file_to_trash", { path });
      set({ largeFiles: get().largeFiles.filter((f) => f.path !== path) });
      return true;
    } catch (error) {
      get().addToast("error", "Delete Failed", String(error));
      return false;
    }
  },

  // Duplicates
  duplicates: [],
  isLoadingDuplicates: false,
  scanDuplicates: async (minSizeMb = 1) => {
    set({ isLoadingDuplicates: true });
    try {
      const duplicates = await invoke<DuplicateGroup[]>(
        "scan_common_duplicates",
        { minSizeMb }
      );
      set({ duplicates });
      get().addToast(
        "success",
        "Scan Complete",
        `Found ${duplicates.length} duplicate groups`
      );
    } catch (error) {
      get().addToast("error", "Scan Failed", String(error));
    } finally {
      set({ isLoadingDuplicates: false });
    }
  },
  deleteDuplicate: async (path) => {
    try {
      await invoke("move_duplicate_to_trash", { path });
      // Update the duplicates list
      const duplicates = get()
        .duplicates.map((group) => ({
          ...group,
          files: group.files.filter((f) => f.path !== path),
        }))
        .filter((group) => group.files.length > 1);
      set({ duplicates });
      return true;
    } catch (error) {
      get().addToast("error", "Delete Failed", String(error));
      return false;
    }
  },
}));
