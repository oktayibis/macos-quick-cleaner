import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppStore } from "../appStore";
import { act } from "react";
import type {
  CacheEntry,
  OrphanFile,
  LargeAppData,
  LargeFile,
  DuplicateGroup,
} from "../../types";

// Mock Tauri invoke
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentSection: "dashboard",
      toasts: [],
      systemInfo: null,
      caches: [],
      isLoadingCaches: false,
      developerCaches: [],
      isLoadingDeveloperCaches: false,
      orphanFiles: [],
      isLoadingOrphans: false,
      largeAppData: [],
      isLoadingLargeAppData: false,
      largeFiles: [],
      isLoadingLargeFiles: false,
      duplicates: [],
      isLoadingDuplicates: false,
    });
    invokeMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets current section", () => {
    const { setSection } = useAppStore.getState();
    act(() => {
      setSection("cache");
    });
    expect(useAppStore.getState().currentSection).toBe("cache");
  });

  describe("Toasts", () => {
    it("adds and auto-dismisses toast", () => {
      const { addToast } = useAppStore.getState();
      act(() => {
        addToast("success", "Test Title", "Test Message");
      });

      expect(useAppStore.getState().toasts).toHaveLength(1);
      expect(useAppStore.getState().toasts[0]).toMatchObject({
        type: "success",
        title: "Test Title",
        message: "Test Message",
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(useAppStore.getState().toasts).toHaveLength(0);
    });

    it("can dismiss toast manually", () => {
      const { addToast, dismissToast } = useAppStore.getState();
      act(() => {
        addToast("info", "Title", "Msg");
      });
      const id = useAppStore.getState().toasts[0].id;

      act(() => {
        dismissToast(id);
      });
      expect(useAppStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("System Info", () => {
    it("loads system info successfully", async () => {
      const mockInfo = { some: "info" };
      invokeMock.mockResolvedValue(mockInfo);
      const { loadSystemInfo } = useAppStore.getState();

      await act(async () => {
        await loadSystemInfo();
      });

      expect(invokeMock).toHaveBeenCalledWith("get_system_info");
      expect(useAppStore.getState().systemInfo).toEqual(mockInfo);
    });

    it("handles system info error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { loadSystemInfo } = useAppStore.getState();

      await act(async () => {
        await loadSystemInfo();
      });

      expect(useAppStore.getState().toasts).toHaveLength(1);
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Scanning Caches", () => {
    it("scans caches successfully", async () => {
      const mockCaches = [{ path: "/Users/test/cache", size: 100 }];
      invokeMock.mockResolvedValue(mockCaches);
      const { scanCaches } = useAppStore.getState();

      const promise = scanCaches();
      expect(useAppStore.getState().isLoadingCaches).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(invokeMock).toHaveBeenCalledWith("scan_all_caches");
      expect(useAppStore.getState().caches).toEqual(mockCaches);
      expect(useAppStore.getState().isLoadingCaches).toBe(false);
      expect(useAppStore.getState().toasts).toHaveLength(1); // Success toast
    });
  });

  describe("Deleting Cache", () => {
    it("deletes cache successfully", async () => {
      const cache: CacheEntry = {
        path: "/test",
        size: 100,
        name: "test",
        cache_type: "Application",
        description: "test",
        is_developer_related: false,
        is_safe_to_delete: true,
      };
      useAppStore.setState({ caches: [cache] });
      invokeMock.mockResolvedValue(null);
      const { deleteCache } = useAppStore.getState();

      await act(async () => {
        const result = await deleteCache("/test");
        expect(result).toBe(true);
      });

      expect(invokeMock).toHaveBeenCalledWith("delete_cache", {
        path: "/test",
      });
      expect(useAppStore.getState().caches).toHaveLength(0);
    });

    it("handles delete error", async () => {
      const cache: CacheEntry = {
        path: "/test",
        size: 100,
        name: "test",
        cache_type: "Application",
        description: "test",
        is_developer_related: false,
        is_safe_to_delete: true,
      };
      useAppStore.setState({ caches: [cache] });
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { deleteCache } = useAppStore.getState();

      await act(async () => {
        const result = await deleteCache("/test");
        expect(result).toBe(false);
      });

      expect(useAppStore.getState().caches).toHaveLength(1); // Still there
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Developer Caches", () => {
    it("scans developer caches", async () => {
      const mockDevCaches = [{ name: "Maven", size: 100, exists: true }];
      invokeMock.mockResolvedValueOnce(true); // is_developer
      invokeMock.mockResolvedValueOnce(mockDevCaches); // scan_developer_caches

      const { scanDeveloperCaches } = useAppStore.getState();
      await act(async () => {
        await scanDeveloperCaches();
      });

      expect(useAppStore.getState().isDeveloper).toBe(true);
      expect(useAppStore.getState().developerCaches).toEqual(mockDevCaches);
      expect(useAppStore.getState().toasts[0].type).toBe("success");
    });

    it("cleans developer cache", async () => {
      invokeMock.mockResolvedValue(null);
      const { cleanDeveloperCache } = useAppStore.getState();
      await act(async () => {
        const res = await cleanDeveloperCache("/path");
        expect(res).toBe(true);
      });
      expect(invokeMock).toHaveBeenCalledWith("clean_developer_cache", {
        path: "/path",
      });
    });

    it("handles scan error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { scanDeveloperCaches } = useAppStore.getState();
      await act(async () => {
        await scanDeveloperCaches();
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });

    it("handles clean error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { cleanDeveloperCache } = useAppStore.getState();
      await act(async () => {
        const res = await cleanDeveloperCache("/path");
        expect(res).toBe(false);
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Orphan Files", () => {
    it("scans orphans", async () => {
      const mockOrphans = [{ path: "/orphan", size: 50 }];
      invokeMock.mockResolvedValue(mockOrphans);
      const { scanOrphanFiles } = useAppStore.getState();
      await act(async () => {
        await scanOrphanFiles();
      });
      expect(useAppStore.getState().orphanFiles).toEqual(mockOrphans);
    });

    it("deletes orphan", async () => {
      const orphan: OrphanFile = {
        path: "/orphan",
        size: 50,
        name: "orphan",
        parent_app: "App",
      };
      useAppStore.setState({
        orphanFiles: [orphan],
      });
      invokeMock.mockResolvedValue(null);
      const { deleteOrphan } = useAppStore.getState();
      await act(async () => {
        const res = await deleteOrphan("/orphan");
        expect(res).toBe(true);
      });
      expect(useAppStore.getState().orphanFiles).toHaveLength(0);
    });

    it("handles scan error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { scanOrphanFiles } = useAppStore.getState();
      await act(async () => {
        await scanOrphanFiles();
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });

    it("handles delete error", async () => {
      const orphan: OrphanFile = {
        path: "/orphan",
        size: 50,
        name: "orphan",
        parent_app: "App",
      };
      useAppStore.setState({ orphanFiles: [orphan] });
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { deleteOrphan } = useAppStore.getState();
      await act(async () => {
        const res = await deleteOrphan("/orphan");
        expect(res).toBe(false);
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Large App Data", () => {
    it("scans large app data", async () => {
      const mockData = [{ path: "/app", size: 1000 }];
      invokeMock.mockResolvedValue(mockData);
      const { scanLargeAppData } = useAppStore.getState();
      await act(async () => {
        await scanLargeAppData();
      });
      expect(useAppStore.getState().largeAppData).toEqual(mockData);
    });

    it("deletes large app data", async () => {
      const data: LargeAppData = { path: "/app", size: 1000, name: "App" };
      useAppStore.setState({
        largeAppData: [data],
      });
      invokeMock.mockResolvedValue(null);
      const { deleteLargeAppData } = useAppStore.getState();
      await act(async () => {
        const res = await deleteLargeAppData("/app");
        expect(res).toBe(true);
      });
      expect(useAppStore.getState().largeAppData).toHaveLength(0);
    });

    it("handles scan error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { scanLargeAppData } = useAppStore.getState();
      await act(async () => {
        await scanLargeAppData();
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });

    it("handles delete error", async () => {
      const data: LargeAppData = { path: "/app", size: 1000, name: "App" };
      useAppStore.setState({ largeAppData: [data] });
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { deleteLargeAppData } = useAppStore.getState();
      await act(async () => {
        const res = await deleteLargeAppData("/app");
        expect(res).toBe(false);
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Large Files", () => {
    it("scans large files", async () => {
      const mockFiles = [{ path: "/file", size: 200 }];
      invokeMock.mockResolvedValue(mockFiles);
      const { scanLargeFiles } = useAppStore.getState();
      await act(async () => {
        await scanLargeFiles();
      });
      expect(useAppStore.getState().largeFiles).toEqual(mockFiles);
    });

    it("deletes large file", async () => {
      const file: LargeFile = { path: "/file", size: 200, name: "file" };
      useAppStore.setState({
        largeFiles: [file],
      });
      invokeMock.mockResolvedValue(null);
      const { deleteFile } = useAppStore.getState();
      await act(async () => {
        const res = await deleteFile("/file");
        expect(res).toBe(true);
      });
      expect(useAppStore.getState().largeFiles).toHaveLength(0);
    });

    it("handles scan error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { scanLargeFiles } = useAppStore.getState();
      await act(async () => {
        await scanLargeFiles();
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });

    it("handles delete error", async () => {
      const file: LargeFile = { path: "/file", size: 200, name: "file" };
      useAppStore.setState({ largeFiles: [file] });
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { deleteFile } = useAppStore.getState();
      await act(async () => {
        const res = await deleteFile("/file");
        expect(res).toBe(false);
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });

  describe("Duplicates", () => {
    it("scans duplicates", async () => {
      const mockDupes = [{ hash: "123", files: [] }];
      invokeMock.mockResolvedValue(mockDupes);
      const { scanDuplicates } = useAppStore.getState();
      await act(async () => {
        await scanDuplicates();
      });
      expect(useAppStore.getState().duplicates).toEqual(mockDupes);
    });

    it("deletes duplicate", async () => {
      const initialDupes: DuplicateGroup[] = [
        {
          hash: "123",
          original_file: { path: "/o", size: 100, modified: 0 },
          files: [
            { path: "/d1", size: 100, modified: 0 },
            { path: "/d2", size: 100, modified: 0 },
          ], // 2 files
          total_wasted: 100,
          count: 2,
        },
      ];
      useAppStore.setState({ duplicates: initialDupes });
      invokeMock.mockResolvedValue(null);

      const { deleteDuplicate } = useAppStore.getState();
      await act(async () => {
        const res = await deleteDuplicate("/d1");
        expect(res).toBe(true);
      });

      // Should still have the group but with 1 file?
      // The logic says `filter((group) => group.files.length > 1)`.
      // If 1 file remains, the group is removed.
      expect(useAppStore.getState().duplicates).toHaveLength(0);
    });

    it("handles scan error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { scanDuplicates } = useAppStore.getState();
      await act(async () => {
        await scanDuplicates();
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });

    it("handles delete error", async () => {
      invokeMock.mockRejectedValue(new Error("Failed"));
      const { deleteDuplicate } = useAppStore.getState();
      await act(async () => {
        const res = await deleteDuplicate("/d1");
        expect(res).toBe(false);
      });
      expect(useAppStore.getState().toasts[0].type).toBe("error");
    });
  });
});
