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
