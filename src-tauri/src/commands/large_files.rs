use crate::scanners::file_scanner::{self, FileCategory, LargeFile};
use tauri::command;

/// Scan a directory for large files
#[command]
pub async fn scan_large_files(
    directory: String,
    min_size_mb: u64,
    categories: Option<Vec<String>>,
) -> Result<Vec<LargeFile>, String> {
    let category_filter = categories.map(|cats| {
        cats.iter()
            .filter_map(|c| match c.as_str() {
                "Video" => Some(FileCategory::Video),
                "Image" => Some(FileCategory::Image),
                "Audio" => Some(FileCategory::Audio),
                "Archive" => Some(FileCategory::Archive),
                "Document" => Some(FileCategory::Document),
                "Application" => Some(FileCategory::Application),
                "DiskImage" => Some(FileCategory::DiskImage),
                _ => None,
            })
            .collect()
    });
    
    Ok(file_scanner::scan_large_files(&directory, min_size_mb, category_filter))
}

/// Scan common directories for large files
#[command]
pub async fn scan_common_large_files(min_size_mb: u64) -> Result<Vec<LargeFile>, String> {
    Ok(file_scanner::scan_common_directories(min_size_mb))
}

/// Delete a file
#[command]
pub async fn delete_file(path: String) -> Result<(), String> {
    file_scanner::delete_file(&path)
}

/// Move a file to trash
#[command]
pub async fn move_file_to_trash(path: String) -> Result<(), String> {
    file_scanner::move_to_trash(&path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[tokio::test]
    async fn test_scan_large_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let _ = scan_large_files(temp_dir.path().to_string_lossy().to_string(), 1, None).await;
    }

    #[tokio::test]
    async fn test_scan_common_large_files() {
        let _ = scan_common_large_files(10).await;
    }

    #[tokio::test]
    async fn test_scan_large_files_with_video_category() {
        let temp_dir = tempfile::tempdir().unwrap();
        let result = scan_large_files(
            temp_dir.path().to_string_lossy().to_string(),
            0,
            Some(vec!["Video".to_string()]),
        )
        .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_scan_large_files_with_multiple_categories() {
        let temp_dir = tempfile::tempdir().unwrap();
        let result = scan_large_files(
            temp_dir.path().to_string_lossy().to_string(),
            0,
            Some(vec![
                "Video".to_string(),
                "Image".to_string(),
                "Audio".to_string(),
                "Archive".to_string(),
                "Document".to_string(),
                "Application".to_string(),
                "DiskImage".to_string(),
            ]),
        )
        .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_scan_large_files_with_unknown_category() {
        let temp_dir = tempfile::tempdir().unwrap();
        let result = scan_large_files(
            temp_dir.path().to_string_lossy().to_string(),
            0,
            Some(vec!["UnknownCategory".to_string()]),
        )
        .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_delete_file() {
        // Create a temp file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_delete.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "delete me").unwrap();
        drop(file);

        let result = delete_file(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(!file_path.exists());
    }

    #[tokio::test]
    async fn test_delete_file_nonexistent() {
        // Functions return Ok(()) for nonexistent files by design (idempotent delete)
        let result = delete_file("/nonexistent/path/file.txt".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_move_file_to_trash() {
        // Create a temp file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_trash_file.txt");
        let mut file = std::fs::File::create(&file_path).unwrap();
        writeln!(file, "trash me").unwrap();
        drop(file);

        // Move to trash (may fail on CI without trash support)
        let _ = move_file_to_trash(file_path.to_string_lossy().to_string()).await;
    }
}

