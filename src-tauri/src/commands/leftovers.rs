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
