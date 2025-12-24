# Quick Cleaner for macOS

Quick Cleaner is a fast, native macOS utility built with Rust (Tauri) and React to help you reclaim disk space and keep your system running smoothly.

![Quick Cleaner Dashboard](https://github.com/oktayibis/macos-quick-cleaner/raw/main/screenshots/dashboard.png)
_(Note: Add screenshot here later)_

## 🚀 Features

- **Smart Cache Cleaning**: Safely remove browser, system, and application caches.
- **Developer Tools**: Specifically targets node_modules, cargo builds, and other dev artifacts.
- **Smart Leftovers**: Finds files left behind by uninstalled applications.
- **Large App Data**: Visualizes the largest folders in your Library to find hidden space hogs.
- **Duplicate Finder**: Efficiently scans for duplicate files to recover wasted space.
- **Native Performance**: Built with Rust backend for blazing fast scanning.

## 📥 Installation

1.  Go to the [Releases](https://github.com/oktayibis/macos-quick-cleaner/releases) page.
2.  Download the latest `.dmg` file.
3.  Drag "Quick Cleaner" to your Applications folder.

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Setup

1.  Clone the repository:

    ```bash
    git clone https://github.com/oktayibis/macos-quick-cleaner.git
    cd macos-quick-cleaner
    ```

2.  Install dependencies:

    ```bash
    npm install
    # or
    yarn install
    ```

3.  Run in development mode:
    ```bash
    npm run tauri dev
    ```

## 🧪 Quality Assurance

We use a strict quality gate to ensure code stability.

- **Linting**:
  ```bash
  npm run quality-gate
  ```
  This runs both `ESLint` (Frontend) and `Clippy` (Backend).

## 🚢 Release Process

To publish a new version of the app, follow these steps:

1.  **Update Version**:
    Bump the version number in both `package.json` and `src-tauri/tauri.conf.json`.

    ```json
    // package.json
    "version": "1.0.1",

    // src-tauri/tauri.conf.json
    "version": "1.0.1",
    ```

2.  **Commit Changes**:

    ```bash
    git commit -am "chore: release v1.0.1"
    ```

3.  **Tag the Release**:
    Create a lightweight tag matching the version number (must start with `v`).

    ```bash
    git tag v1.0.1
    ```

4.  **Push Changes and Tag**:

    ```bash
    git push origin main
    git push origin v1.0.1
    ```

5.  **Wait for CI**:
    The GitHub Action `Release App` will automatically trigger. It will:

    - Build the macOS application (`.dmg`).
    - Create a GitHub Release draft.
    - Upload the assets.

6.  **Publish**:
    Go to the [Releases](https://github.com/oktayibis/macos-quick-cleaner/releases) page on GitHub, verify the draft, and click "Publish".

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Run the quality gate (`npm run quality-gate`)
5.  Push to the branch (`git push origin feature/AmazingFeature`)
6.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
