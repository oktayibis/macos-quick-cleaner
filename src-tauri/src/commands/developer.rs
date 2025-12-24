use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use walkdir::WalkDir;

/// Developer cache location
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeveloperCache {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub description: String,
    pub exists: bool,
    pub safe_to_clean: bool,
}

/// Calculate directory size using actual disk blocks (handles sparse files correctly)
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

/// Calculate apparent size (for comparison/display when needed)
#[allow(dead_code)]
fn get_apparent_size(path: &PathBuf) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Get home directory
fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

/// Scan all known developer cache locations
#[command]
pub async fn scan_developer_caches() -> Result<Vec<DeveloperCache>, String> {
    let mut caches = Vec::new();
    
    if let Some(home) = get_home_dir() {
        // Define known developer cache locations
        // (name, path, description, safe_to_clean, skip_size_calc)
        let cache_locations: Vec<(&str, PathBuf, &str, bool, bool)> = vec![
            // npm
            (
                "npm Cache",
                home.join(".npm"),
                "Node.js package manager cache",
                true,
                false,
            ),
            // yarn
            (
                "Yarn Cache",
                home.join(".yarn").join("cache"),
                "Yarn package manager cache",
                true,
                false,
            ),
            // pnpm
            (
                "pnpm Store",
                home.join(".pnpm-store"),
                "pnpm package manager store",
                true,
                false,
            ),
            // Cargo (Rust)
            (
                "Cargo Cache",
                home.join(".cargo").join("registry").join("cache"),
                "Rust package registry cache",
                true,
                false,
            ),
            // CocoaPods
            (
                "CocoaPods Cache",
                home.join("Library").join("Caches").join("CocoaPods"),
                "iOS dependency manager cache",
                true,
                false,
            ),
            // Xcode DerivedData
            (
                "Xcode DerivedData",
                home.join("Library").join("Developer").join("Xcode").join("DerivedData"),
                "Xcode build artifacts (safe to clean)",
                true,
                false,
            ),
            // Xcode Archives
            (
                "Xcode Archives",
                home.join("Library").join("Developer").join("Xcode").join("Archives"),
                "Xcode archived builds",
                false,
                false,
            ),
            // Gradle
            (
                "Gradle Cache",
                home.join(".gradle").join("caches"),
                "Android/Java build cache",
                true,
                false,
            ),
            // Maven
            (
                "Maven Repository",
                home.join(".m2").join("repository"),
                "Maven dependencies (partial clean recommended)",
                false,
                false,
            ),
            // Homebrew
            (
                "Homebrew Cache",
                home.join("Library").join("Caches").join("Homebrew"),
                "Homebrew package downloads",
                true,
                false,
            ),
            // pip
            (
                "pip Cache",
                home.join("Library").join("Caches").join("pip"),
                "Python package cache",
                true,
                false,
            ),
            // VS Code Extensions Cache
            (
                "VS Code Cache",
                home.join("Library").join("Application Support").join("Code").join("Cache"),
                "Visual Studio Code cache",
                true,
                false,
            ),
            // Android SDK
            (
                "Android SDK Cache",
                home.join("Library").join("Android").join("sdk").join(".temp"),
                "Android SDK temporary files",
                true,
                false,
            ),
            // Composer (PHP)
            (
                "Composer Cache",
                home.join(".composer").join("cache"),
                "PHP Composer package cache",
                true,
                false,
            ),
            // Go modules
            (
                "Go Modules Cache",
                home.join("go").join("pkg").join("mod").join("cache"),
                "Go modules cache",
                true,
                false,
            ),
        ];
        
        for (name, path, description, safe, _skip) in cache_locations {
            let exists = path.exists();
            let size = if exists { get_directory_size(&path) } else { 0 };
            
            caches.push(DeveloperCache {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
                size,
                description: description.to_string(),
                exists,
                safe_to_clean: safe,
            });
        }
        
        // Handle Docker separately - use docker system df if available
        let docker_path = home.join("Library").join("Containers").join("com.docker.docker").join("Data");
        if docker_path.exists() {
            // Try to get Docker disk usage via command
            let docker_size = get_docker_disk_usage().unwrap_or_else(|| get_directory_size(&docker_path));
            
            caches.push(DeveloperCache {
                name: "Docker Desktop".to_string(),
                path: docker_path.to_string_lossy().to_string(),
                size: docker_size,
                description: "Docker Desktop data (use 'docker system prune' to clean)".to_string(),
                exists: true,
                safe_to_clean: false,
            });
        }
    }
    
    // Sort by size descending, only existing caches
    caches.sort_by(|a, b| b.size.cmp(&a.size));
    Ok(caches)
}

/// Get Docker disk usage using actual disk blocks
fn get_docker_disk_usage() -> Option<u64> {
    let home = dirs::home_dir()?;
    let docker_data = home.join("Library").join("Containers").join("com.docker.docker").join("Data");
    
    if !docker_data.exists() {
        return None;
    }
    
    // Calculate size using blocks (handles sparse files)
    Some(get_directory_size(&docker_data))
}

/// Clean a developer cache
#[command]
pub async fn clean_developer_cache(path: String) -> Result<u64, String> {
    let path = PathBuf::from(&path);
    
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }
    
    // Don't allow cleaning Docker this way
    if path.to_string_lossy().contains("com.docker.docker") {
        return Err("Please use 'docker system prune' command or Docker Desktop UI to clean Docker data".to_string());
    }
    
    let size_before = get_directory_size(&path);
    
    // Remove contents but keep the directory
    if let Ok(entries) = fs::read_dir(&path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                fs::remove_dir_all(&entry_path).map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(&entry_path).map_err(|e| e.to_string())?;
            }
        }
    }
    
    Ok(size_before)
}

/// Get total developer cache size
#[command]
pub async fn get_total_developer_cache_size() -> Result<u64, String> {
    let caches = scan_developer_caches().await?;
    Ok(caches.iter().filter(|c| c.exists).map(|c| c.size).sum())
}

/// Check if user is a developer (has dev tools installed)
#[command]
pub async fn is_developer_user() -> Result<bool, String> {
    if let Some(home) = get_home_dir() {
        // Check for common developer indicators
        let dev_indicators = vec![
            home.join(".npm"),
            home.join(".cargo"),
            home.join(".gradle"),
            home.join("Library").join("Developer").join("Xcode"),
            home.join(".git"),
            PathBuf::from("/Applications/Xcode.app"),
            PathBuf::from("/Applications/Visual Studio Code.app"),
        ];
        
        for path in dev_indicators {
            if path.exists() {
                return Ok(true);
            }
        }
    }
    
    Ok(false)
}
