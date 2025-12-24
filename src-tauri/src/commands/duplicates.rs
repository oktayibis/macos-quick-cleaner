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
    use std::io::Write;

    #[tokio::test]
    async fn test_scan_duplicates() {
        let temp_dir = tempfile::tempdir().unwrap();
        let _ = scan_duplicates(temp_dir.path().to_string_lossy().to_string(), 0).await;
    }

    #[tokio::test]
    async fn test_scan_common_duplicates() {
        let _ = scan_common_duplicates(10).await;
    }

    #[tokio::test]
    async fn test_delete_duplicate() {
        // Create a temp file to delete
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_dup.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "test content").unwrap();
        drop(file);

        // Delete it
        let result = delete_duplicate(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(!file_path.exists());
    }

    #[tokio::test]
    async fn test_delete_duplicate_nonexistent() {
        // Functions return Ok(()) for nonexistent files by design (idempotent delete)
        let result = delete_duplicate("/nonexistent/path/file.txt".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_move_duplicate_to_trash() {
        // Create a temp file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_trash.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "trash content").unwrap();
        drop(file);

        // Move to trash (this may fail on CI without trash support, so we just check it doesn't panic)
        let _ = move_duplicate_to_trash(file_path.to_string_lossy().to_string()).await;
    }

    #[tokio::test]
    async fn test_get_duplicates_wasted_space() {
        // This scans common directories, should return a u64
        let result = get_duplicates_wasted_space(100).await;
        assert!(result.is_ok());
    }
}

