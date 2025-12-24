use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

/// Represents a large application data folder
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LargeAppData {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub location: String, // "ApplicationSupport" or "Containers"
}

/// Get the user's home directory
fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

/// Calculate directory size using actual disk usage (blocks)
fn get_directory_size(path: &PathBuf) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| {
            // Use blocks * block_size for actual disk usage on Unix
            // This correctly handles sparse files like Docker.raw
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                // blocks are in 512-byte units
                m.blocks() * 512
            }
            #[cfg(not(unix))]
            {
                m.len()
            }
        })
        .sum()
}

/// Scan a directory and return its immediate subdirectories with sizes
fn scan_directory_for_large_folders(base_path: PathBuf, location: &str) -> Vec<LargeAppData> {
    let mut folders = Vec::new();
    
    if !base_path.exists() {
        return folders;
    }
    
    if let Ok(read_dir) = fs::read_dir(&base_path) {
        for entry in read_dir.filter_map(|e| e.ok()) {
            let path = entry.path();
            
            // Only process directories
            if !path.is_dir() {
                continue;
            }
            
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden folders
            if name.starts_with('.') {
                continue;
            }
            
            // Calculate size
            let size = get_directory_size(&path);
            
            // Only include folders > 1MB
            if size > 1_000_000 {
                folders.push(LargeAppData {
                    path: path.to_string_lossy().to_string(),
                    name,
                    size,
                    location: location.to_string(),
                });
            }
        }
    }
    
    folders
}

/// Scan for large application data folders
pub fn scan_large_app_data() -> Vec<LargeAppData> {
    let mut all_folders = Vec::new();
    
    if let Some(home) = get_home_dir() {
        let library = home.join("Library");
        
        // Scan Application Support
        let app_support = library.join("Application Support");
        all_folders.extend(scan_directory_for_large_folders(app_support, "ApplicationSupport"));
        
        // Scan Containers
        let containers = library.join("Containers");
        all_folders.extend(scan_directory_for_large_folders(containers, "Containers"));
        
        // Scan Caches
        let caches = library.join("Caches");
        all_folders.extend(scan_directory_for_large_folders(caches, "Caches"));
    }
    
    // Sort by size (largest first)
    all_folders.sort_by(|a, b| b.size.cmp(&a.size));
    
    // Return top 50
    all_folders.truncate(50);
    all_folders
}
