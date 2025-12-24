use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use walkdir::WalkDir;

/// Categories of large files
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileCategory {
    Video,
    Image,
    Audio,
    Archive,
    Document,
    Application,
    DiskImage,
    Other,
}

/// Represents a large file found on the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LargeFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub category: FileCategory,
    pub last_modified: Option<u64>, // Unix timestamp
    pub extension: String,
}

/// Video file extensions
const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "mpeg", "mpg", "3gp"
];

/// Image file extensions
const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "raw", "cr2", "nef", 
    "arw", "heic", "heif", "webp", "psd", "svg"
];

/// Audio file extensions
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "wav", "flac", "aac", "m4a", "wma", "ogg", "aiff", "alac"
];

/// Archive file extensions
const ARCHIVE_EXTENSIONS: &[&str] = &[
    "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso", "pkg"
];

/// Document file extensions
const DOCUMENT_EXTENSIONS: &[&str] = &[
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pages", "numbers", "keynote"
];

/// Get the user's home directory
fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

/// Determine the file category based on extension
fn get_file_category(extension: &str) -> FileCategory {
    let ext = extension.to_lowercase();
    
    if VIDEO_EXTENSIONS.contains(&ext.as_str()) {
        return FileCategory::Video;
    }
    if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return FileCategory::Image;
    }
    if AUDIO_EXTENSIONS.contains(&ext.as_str()) {
        return FileCategory::Audio;
    }
    if ARCHIVE_EXTENSIONS.contains(&ext.as_str()) {
        return FileCategory::Archive;
    }
    if DOCUMENT_EXTENSIONS.contains(&ext.as_str()) {
        return FileCategory::Document;
    }
    if ext == "app" {
        return FileCategory::Application;
    }
    if ext == "dmg" {
        return FileCategory::DiskImage;
    }
    
    FileCategory::Other
}

/// Scan a directory for large files
pub fn scan_large_files(
    directory: &str,
    min_size_mb: u64,
    categories: Option<Vec<FileCategory>>,
) -> Vec<LargeFile> {
    let mut large_files = Vec::new();
    let min_size_bytes = min_size_mb * 1024 * 1024;
    let path = PathBuf::from(directory);
    
    if !path.exists() {
        return large_files;
    }
    
    for entry in WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();
        
        // Skip hidden files
        if file_path.file_name().map(|s| s.to_string_lossy().starts_with('.')).unwrap_or(false) {
            continue;
        }
        
        if let Ok(metadata) = fs::metadata(file_path) {
            let size = metadata.len();
            
            if size >= min_size_bytes {
                let extension = file_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let category = get_file_category(&extension);
                
                // Filter by category if specified
                if let Some(ref cats) = categories {
                    if !cats.contains(&category) {
                        continue;
                    }
                }
                
                let last_modified = metadata.modified().ok().and_then(|t| {
                    t.duration_since(SystemTime::UNIX_EPOCH).ok().map(|d| d.as_secs())
                });
                
                large_files.push(LargeFile {
                    path: file_path.to_string_lossy().to_string(),
                    name: file_path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    size,
                    category,
                    last_modified,
                    extension,
                });
            }
        }
    }
    
    // Sort by size descending
    large_files.sort_by(|a, b| b.size.cmp(&a.size));
    large_files
}

/// Scan common directories for large files
pub fn scan_common_directories(min_size_mb: u64) -> Vec<LargeFile> {
    let mut all_files = Vec::new();
    
    if let Some(home) = get_home_dir() {
        // Scan common large file locations
        let directories = vec![
            home.join("Downloads"),
            home.join("Desktop"),
            home.join("Documents"),
            home.join("Movies"),
            home.join("Music"),
            home.join("Pictures"),
        ];
        
        for dir in directories {
            if dir.exists() {
                all_files.extend(scan_large_files(
                    &dir.to_string_lossy(),
                    min_size_mb,
                    None,
                ));
            }
        }
    }
    
    // Sort and deduplicate
    all_files.sort_by(|a, b| b.size.cmp(&a.size));
    all_files
}

/// Delete a file
pub fn delete_file(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() && path.is_file() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Move file to trash (macOS)
pub fn move_to_trash(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() {
        // Use macOS trash functionality via NSFileManager
        // For now, we'll just simulate by moving to ~/.Trash
        if let Some(home) = get_home_dir() {
            let trash = home.join(".Trash");
            let file_name = path.file_name().ok_or("Invalid file name")?;
            let dest = trash.join(file_name);
            fs::rename(&path, &dest).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    #[test]
    fn test_get_file_category() {
        assert_eq!(get_file_category("jpg"), FileCategory::Image);
        assert_eq!(get_file_category("JPG"), FileCategory::Image);
        assert_eq!(get_file_category("mp4"), FileCategory::Video);
        assert_eq!(get_file_category("doc"), FileCategory::Document);
        assert_eq!(get_file_category("zip"), FileCategory::Archive);
        assert_eq!(get_file_category("app"), FileCategory::Application);
        assert_eq!(get_file_category("dmg"), FileCategory::DiskImage);
        assert_eq!(get_file_category("unknown_ext"), FileCategory::Other);
    }

    #[test]
    fn test_scan_large_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let dir_path = temp_dir.path();

        // Create a large file
        let large_file_path = dir_path.join("large_video.mp4");
        let f = File::create(&large_file_path).unwrap();
        f.set_len(1024 * 1024 * 5).unwrap(); // 5MB

        // Create a small file
        let small_file_path = dir_path.join("small.txt");
        let f = File::create(&small_file_path).unwrap();
        f.set_len(1024).unwrap(); // 1KB

        let files = scan_large_files(dir_path.to_str().unwrap(), 1, None); // Min 1MB

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, large_file_path.to_string_lossy());
        assert_eq!(files[0].category, FileCategory::Video);
    }
}

