// Utility hook for formatting bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

// Format relative time
export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return "Unknown";

  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

// Get category color class
export function getCategoryClass(category: string): string {
  const classes: Record<string, string> = {
    Video: "badge-video",
    Image: "badge-image",
    Audio: "badge-audio",
    Archive: "badge-archive",
    Document: "badge-document",
    Application: "badge-other",
    DiskImage: "badge-archive",
    Other: "badge-other",
  };
  return classes[category] || "badge-other";
}
