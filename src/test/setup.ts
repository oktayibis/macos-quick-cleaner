import "@testing-library/jest-dom";

// Mock Tauri API
// This is a basic mock. We might need to extend it as we test more features.
Object.defineProperty(window, "__TAURI_IPC__", {
  value: () => {},
});
