use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use walkdir::WalkDir;
use std::fs;

/// Types of cache that can be found on macOS
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CacheType {
    Browser,
    System,
    Application,
    Developer,
    Unknown,
}

/// Represents a cache entry found on the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub cache_type: CacheType,
    pub is_developer_related: bool,
    pub is_safe_to_delete: bool,
    pub description: String,
}

/// Developer-related cache patterns
const DEVELOPER_PATTERNS: &[&str] = &[
    "com.apple.dt.Xcode",
    "org.cocoapods",
    "com.microsoft.VSCode",
    "JetBrains",
    "npm",
    "yarn",
    "cargo",
    "gradle",
    "maven",
    "homebrew",
    "pip",
    "composer",
    "go-build",
    "rustup",
    "CocoaPods",
    "Google",
    "com.docker",
    "Android",
];

/// Browser cache patterns
const BROWSER_PATTERNS: &[&str] = &[
    "com.apple.Safari",
    "com.google.Chrome",
    "org.mozilla.firefox",
    "com.microsoft.edgemac",
    "com.brave.Browser",
    "com.operasoftware.Opera",
    "company.thebrowser.Browser",
];

/// System cache patterns (be careful with these)
const SYSTEM_PATTERNS: &[&str] = &[
    "com.apple.",
    "CloudKit",
    "CoreSimulator",
];

/// Get the user's home directory
fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

/// Calculate the total size of a directory
pub fn get_directory_size(path: &PathBuf) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Determine the cache type based on the folder name
fn determine_cache_type(name: &str) -> CacheType {
    if BROWSER_PATTERNS.iter().any(|p| name.contains(p)) {
        return CacheType::Browser;
    }
    if DEVELOPER_PATTERNS.iter().any(|p| name.contains(p)) {
        return CacheType::Developer;
    }
    if SYSTEM_PATTERNS.iter().any(|p| name.contains(p)) {
        return CacheType::System;
    }
    CacheType::Application
}

/// Check if a cache is developer-related
fn is_developer_cache(name: &str) -> bool {
    DEVELOPER_PATTERNS.iter().any(|p| name.contains(p))
}

/// Determine if a cache is safe to delete
fn is_safe_to_delete(_name: &str, cache_type: &CacheType) -> bool {
    match cache_type {
        CacheType::System => false, // Never auto-delete system caches
        CacheType::Browser => true,
        CacheType::Developer => true, // Developer caches are usually safe
        CacheType::Application => true,
        CacheType::Unknown => false,
    }
}

/// Get a human-readable description for the cache
fn get_cache_description(name: &str, cache_type: &CacheType) -> String {
    match cache_type {
        CacheType::Browser => format!("Browser cache for {}", name.split('.').next_back().unwrap_or(name)),
        CacheType::Developer => "Developer tools cache".to_string(),
        CacheType::System => "System cache (use caution)".to_string(),
        CacheType::Application => "Application cache".to_string(),
        CacheType::Unknown => "Unknown cache type".to_string(),
    }
}

/// Scan the ~/Library/Caches directory for cache entries
pub fn scan_user_caches() -> Vec<CacheEntry> {
    let mut entries = Vec::new();
    
    if let Some(home) = get_home_dir() {
        let cache_path = home.join("Library").join("Caches");
        
        if cache_path.exists() {
            if let Ok(read_dir) = fs::read_dir(&cache_path) {
                for entry in read_dir.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    if path.is_dir() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        let size = get_directory_size(&path);
                        let cache_type = determine_cache_type(&name);
                        let is_dev = is_developer_cache(&name);
                        let safe = is_safe_to_delete(&name, &cache_type);
                        let desc = get_cache_description(&name, &cache_type);
                        
                        entries.push(CacheEntry {
                            path: path.to_string_lossy().to_string(),
                            name,
                            size,
                            cache_type,
                            is_developer_related: is_dev,
                            is_safe_to_delete: safe,
                            description: desc,
                        });
                    }
                }
            }
        }
    }
    
    // Sort by size descending
    entries.sort_by(|a, b| b.size.cmp(&a.size));
    entries
}

/// Scan the /Library/Caches directory for system cache entries
pub fn scan_system_caches() -> Vec<CacheEntry> {
    let mut entries = Vec::new();
    let cache_path = PathBuf::from("/Library/Caches");
    
    if cache_path.exists() {
        if let Ok(read_dir) = fs::read_dir(&cache_path) {
            for entry in read_dir.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let size = get_directory_size(&path);
                    
                    entries.push(CacheEntry {
                        path: path.to_string_lossy().to_string(),
                        name: name.clone(),
                        size,
                        cache_type: CacheType::System,
                        is_developer_related: is_developer_cache(&name),
                        is_safe_to_delete: false, // System caches require caution
                        description: "System-level cache (requires admin)".to_string(),
                    });
                }
            }
        }
    }
    
    entries.sort_by(|a, b| b.size.cmp(&a.size));
    entries
}

/// Get all caches (user + system)
pub fn scan_all_caches() -> Vec<CacheEntry> {
    let mut all = scan_user_caches();
    all.extend(scan_system_caches());
    all.sort_by(|a, b| b.size.cmp(&a.size));
    all
}

/// Delete a cache directory
pub fn delete_cache(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() && path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determine_cache_type() {
        assert_eq!(determine_cache_type("com.apple.Safari"), CacheType::Browser);
        assert_eq!(determine_cache_type("org.mozilla.firefox"), CacheType::Browser);
        assert_eq!(determine_cache_type("com.apple.dt.Xcode"), CacheType::Developer);
        assert_eq!(determine_cache_type("cargo"), CacheType::Developer);
        assert_eq!(determine_cache_type("com.apple.System"), CacheType::System);
        assert_eq!(determine_cache_type("com.myapp.Something"), CacheType::Application);
    }

    #[test]
    fn test_is_developer_cache() {
        assert!(is_developer_cache("com.apple.dt.Xcode"));
        assert!(is_developer_cache("npm"));
        assert!(!is_developer_cache("com.apple.Safari"));
    }

    #[test]
    fn test_is_safe_to_delete() {
        assert!(is_safe_to_delete("any", &CacheType::Browser));
        assert!(is_safe_to_delete("any", &CacheType::Developer));
        assert!(is_safe_to_delete("any", &CacheType::Application));
        assert!(!is_safe_to_delete("any", &CacheType::System));
        assert!(!is_safe_to_delete("any", &CacheType::Unknown));
    }
}
