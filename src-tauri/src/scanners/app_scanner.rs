use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

/// Represents an installed application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub bundle_id: String,
    pub path: String,
}

/// Types of orphan files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrphanType {
    ApplicationSupport,
    Preferences,
    Containers,
    Caches,
    Logs,
    Other,
}

/// Represents an orphan file left behind by an uninstalled app
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrphanFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub orphan_type: OrphanType,
    pub possible_app_name: String,
}

/// Get the user's home directory
fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

/// Calculate directory size
fn get_directory_size(path: &PathBuf) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Extract bundle ID from Info.plist if available
fn get_bundle_id_from_app(app_path: &PathBuf) -> Option<String> {
    let plist_path = app_path.join("Contents").join("Info.plist");
    if plist_path.exists() {
        if let Ok(plist) = plist::from_file::<_, plist::Value>(&plist_path) {
            if let Some(dict) = plist.as_dictionary() {
                if let Some(bundle_id) = dict.get("CFBundleIdentifier") {
                    return bundle_id.as_string().map(|s| s.to_string());
                }
            }
        }
    }
    None
}

/// Scan /Applications and ~/Applications for installed apps
pub fn scan_installed_apps() -> Vec<InstalledApp> {
    let mut apps = Vec::new();
    let app_dirs = vec![
        PathBuf::from("/Applications"),
        get_home_dir().map(|h| h.join("Applications")).unwrap_or_default(),
    ];
    
    for app_dir in app_dirs {
        if !app_dir.exists() {
            continue;
        }
        
        if let Ok(read_dir) = fs::read_dir(&app_dir) {
            for entry in read_dir.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().map(|e| e == "app").unwrap_or(false) {
                    let name = path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let bundle_id = get_bundle_id_from_app(&path).unwrap_or_default();
                    
                    apps.push(InstalledApp {
                        name,
                        bundle_id,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    
    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}

/// Get a set of known bundle ID prefixes from installed apps
fn get_known_bundle_prefixes(apps: &[InstalledApp]) -> HashSet<String> {
    let mut prefixes = HashSet::new();
    for app in apps {
        if !app.bundle_id.is_empty() {
            prefixes.insert(app.bundle_id.clone());
            // Also add the reversed domain prefix (e.g., "com.apple")
            if let Some(prefix) = app.bundle_id.rsplitn(2, '.').last() {
                prefixes.insert(prefix.to_string());
            }
        }
        // Add normalized app name
        prefixes.insert(app.name.to_lowercase().replace(" ", ""));
    }
    prefixes
}

/// Check if a folder name might be associated with a known app
fn is_known_app(name: &str, known_prefixes: &HashSet<String>) -> bool {
    let normalized = name.to_lowercase().replace(" ", "").replace("-", "").replace("_", "");
    
    // Direct match
    if known_prefixes.contains(&normalized) || known_prefixes.contains(name) {
        return true;
    }
    
    // Check if any prefix matches
    for prefix in known_prefixes {
        if normalized.contains(&prefix.to_lowercase()) || prefix.to_lowercase().contains(&normalized) {
            return true;
        }
    }
    
    false
}

/// Extract a possible app name from the file/folder name
fn extract_app_name(name: &str) -> String {
    // Try to extract readable name from bundle ID or folder name
    let parts: Vec<&str> = name.split('.').collect();
    if parts.len() > 2 {
        // Likely a bundle ID like com.company.AppName
        return parts.last().unwrap_or(&name).to_string();
    }
    name.to_string()
}

/// Scan a Library subdirectory for potential orphan files
fn scan_library_subdir(subdir: &str, orphan_type: OrphanType, known_prefixes: &HashSet<String>) -> Vec<OrphanFile> {
    let mut orphans = Vec::new();
    
    if let Some(home) = get_home_dir() {
        let dir_path = home.join("Library").join(subdir);
        
        if dir_path.exists() {
            if let Ok(read_dir) = fs::read_dir(&dir_path) {
                for entry in read_dir.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    
                    // Skip if it's a known app
                    if is_known_app(&name, known_prefixes) {
                        continue;
                    }
                    
                    // Skip system/Apple items
                    if name.starts_with("com.apple.") || name.starts_with(".") {
                        continue;
                    }
                    
                    let size = if path.is_dir() {
                        get_directory_size(&path)
                    } else {
                        path.metadata().map(|m| m.len()).unwrap_or(0)
                    };
                    
                    // Only include if size > 0
                    if size > 0 {
                        orphans.push(OrphanFile {
                            path: path.to_string_lossy().to_string(),
                            name: name.clone(),
                            size,
                            orphan_type: orphan_type.clone(),
                            possible_app_name: extract_app_name(&name),
                        });
                    }
                }
            }
        }
    }
    
    orphans
}

/// Scan for all orphan files
pub fn scan_orphan_files() -> Vec<OrphanFile> {
    let apps = scan_installed_apps();
    let known_prefixes = get_known_bundle_prefixes(&apps);
    
    let mut all_orphans = Vec::new();
    
    // Scan different Library subdirectories
    all_orphans.extend(scan_library_subdir("Application Support", OrphanType::ApplicationSupport, &known_prefixes));
    all_orphans.extend(scan_library_subdir("Preferences", OrphanType::Preferences, &known_prefixes));
    all_orphans.extend(scan_library_subdir("Containers", OrphanType::Containers, &known_prefixes));
    all_orphans.extend(scan_library_subdir("Logs", OrphanType::Logs, &known_prefixes));
    
    // Sort by size descending
    all_orphans.sort_by(|a, b| b.size.cmp(&a.size));
    all_orphans
}

/// Delete an orphan file or directory
pub fn delete_orphan(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() {
        if path.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
