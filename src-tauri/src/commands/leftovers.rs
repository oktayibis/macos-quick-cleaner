use crate::scanners::app_scanner::{self, InstalledApp, OrphanFile};
use crate::scanners::app_data_scanner::{self, LargeAppData};
use tauri::command;
use std::process::Command;

/// Scan for installed applications
#[command]
pub async fn scan_installed_apps() -> Result<Vec<InstalledApp>, String> {
    Ok(app_scanner::scan_installed_apps())
}

/// Scan for orphan files from uninstalled apps
#[command]
pub async fn scan_orphan_files() -> Result<Vec<OrphanFile>, String> {
    Ok(app_scanner::scan_orphan_files())
}

/// Scan for large application data folders (sorted by size)
#[command]
pub async fn scan_large_app_data() -> Result<Vec<LargeAppData>, String> {
    Ok(app_data_scanner::scan_large_app_data())
}

/// Delete an orphan file or directory
#[command]
pub async fn delete_orphan(path: String) -> Result<(), String> {
    app_scanner::delete_orphan(&path)
}

/// Open a file or folder in Finder
#[command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open Finder: {}", e))?;
    Ok(())
}

/// Get total size of orphan files
#[command]
pub async fn get_orphan_total_size() -> Result<u64, String> {
    let orphans = app_scanner::scan_orphan_files();
    Ok(orphans.iter().map(|o| o.size).sum())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[tokio::test]
    async fn test_scan_wrappers() {
        let _ = scan_installed_apps().await;
        let _ = scan_orphan_files().await;
        let _ = scan_large_app_data().await;
        let _ = get_orphan_total_size().await;
    }

    #[tokio::test]
    async fn test_delete_orphan_file() {
        // Create a temp file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_orphan.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "orphan content").unwrap();
        drop(file);

        let result = delete_orphan(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(!file_path.exists());
    }

    #[tokio::test]
    async fn test_delete_orphan_directory() {
        // Create a temp directory with a file inside
        let temp_dir = tempfile::tempdir().unwrap();
        let sub_dir = temp_dir.path().join("orphan_dir");
        std::fs::create_dir(&sub_dir).unwrap();
        let file_path = sub_dir.join("file.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "file in orphan dir").unwrap();
        drop(file);

        let result = delete_orphan(sub_dir.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(!sub_dir.exists());
    }

    #[tokio::test]
    async fn test_delete_orphan_nonexistent() {
        // Functions return Ok(()) for nonexistent files by design (idempotent delete)
        let result = delete_orphan("/nonexistent/path/orphan".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_reveal_in_finder() {
        // Create a temp file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("reveal_test.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "reveal me").unwrap();
        drop(file);

        // On macOS, this should work; on CI/Linux it may fail but shouldn't panic
        let _ = reveal_in_finder(file_path.to_string_lossy().to_string()).await;
    }
}

