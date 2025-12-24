use crate::scanners::app_scanner::{self, InstalledApp, OrphanFile};
use tauri::command;

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

/// Delete an orphan file or directory
#[command]
pub async fn delete_orphan(path: String) -> Result<(), String> {
    app_scanner::delete_orphan(&path)
}

/// Get total size of orphan files
#[command]
pub async fn get_orphan_total_size() -> Result<u64, String> {
    let orphans = app_scanner::scan_orphan_files();
    Ok(orphans.iter().map(|o| o.size).sum())
}
