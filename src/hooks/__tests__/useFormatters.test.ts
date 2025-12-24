import { describe, it, expect } from "vitest";
import { formatBytes, formatTimeAgo, getCategoryClass } from "../useFormatters";

describe("useFormatters", () => {
  describe("formatBytes", () => {
    it("formats 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("formats bytes", () => {
      expect(formatBytes(100)).toBe("100 B");
    });

    it("formats kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.00 KB");
      expect(formatBytes(1536)).toBe("1.50 KB");
    });

    it("formats megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    });

    it("formats gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
    });
  });

  describe("formatTimeAgo", () => {
    it("handles null timestamp", () => {
      expect(formatTimeAgo(null)).toBe("Unknown");
    });

    it('returns "Just now" for less than 60 seconds', () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 30)).toBe("Just now");
    });

    it("returns minutes for less than 1 hour", () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 120)).toBe("2 min ago"); // 2 minutes
    });

    it("returns hours for less than 1 day", () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 7200)).toBe("2 hours ago"); // 2 hours
    });

    it("returns days for less than 1 month", () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 172800)).toBe("2 days ago"); // 2 days
    });

    it("returns months for less than 1 year", () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 5184000)).toBe("2 months ago"); // ~2 months
    });

    it("returns years for more than 1 year", () => {
      const now = Date.now() / 1000;
      expect(formatTimeAgo(now - 63072000)).toBe("2 years ago"); // 2 years
    });
  });

  describe("getCategoryClass", () => {
    it("returns correct class for known categories", () => {
      expect(getCategoryClass("Video")).toBe("badge-video");
      expect(getCategoryClass("Image")).toBe("badge-image");
    });

    it("returns badge-other for unknown category", () => {
      expect(getCategoryClass("Spaceship")).toBe("badge-other");
    });
  });
});
