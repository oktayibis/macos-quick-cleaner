use crate::scanners::hash_scanner::{self, DuplicateGroup};
use tauri::command;

/// Scan a directory for duplicate files
#[command]
pub async fn scan_duplicates(directory: String, min_size_mb: u64) -> Result<Vec<DuplicateGroup>, String> {
    Ok(hash_scanner::scan_duplicates(&directory, min_size_mb))
}

/// Scan common directories for duplicates
#[command]
pub async fn scan_common_duplicates(min_size_mb: u64) -> Result<Vec<DuplicateGroup>, String> {
    Ok(hash_scanner::scan_common_directories_for_duplicates(min_size_mb))
}

/// Delete a duplicate file
#[command]
pub async fn delete_duplicate(path: String) -> Result<(), String> {
    hash_scanner::delete_duplicate(&path)
}

/// Move a duplicate file to trash
#[command]
pub async fn move_duplicate_to_trash(path: String) -> Result<(), String> {
    hash_scanner::move_duplicate_to_trash(&path)
}

/// Get total wasted space from duplicates
#[command]
pub async fn get_duplicates_wasted_space(min_size_mb: u64) -> Result<u64, String> {
    let duplicates = hash_scanner::scan_common_directories_for_duplicates(min_size_mb);
    Ok(duplicates.iter().map(|d| d.total_wasted).sum())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_scan_duplicates() {
        let temp_dir = tempfile::tempdir().unwrap();
        let _ = scan_duplicates(temp_dir.path().to_string_lossy().to_string(), 0).await;
    }

    #[tokio::test]
    async fn test_scan_common_duplicates() {
        let _ = scan_common_duplicates(10).await;
    }
}
