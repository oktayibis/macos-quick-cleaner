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
fn get_bundle_id_from_app(app_path: &std::path::Path) -> Option<String> {
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
    let mut app_dirs = vec![PathBuf::from("/Applications")];
    if let Some(home) = get_home_dir() {
        app_dirs.push(home.join("Applications"));
    }
    scan_apps_in_directories(app_dirs)
}

/// Scan specific directories for installed apps
pub fn scan_apps_in_directories(app_dirs: Vec<PathBuf>) -> Vec<InstalledApp> {
    let mut apps = Vec::new();
    
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
    
    // Add all installed .app bundles
    for app in apps {
        if !app.bundle_id.is_empty() {
            // Add full bundle ID
            prefixes.insert(app.bundle_id.clone());
            prefixes.insert(app.bundle_id.to_lowercase());
            
            // Add each component of the bundle ID
            // e.g., com.adobe.lightroomCC -> ["com", "adobe", "lightroomcc"]
            for part in app.bundle_id.split('.') {
                if !part.is_empty() && part.len() > 2 {
                    prefixes.insert(part.to_lowercase());
                }
            }
        }
        
        // Add normalized app name
        let normalized_name = app.name.to_lowercase().replace(" ", "").replace("-", "").replace("_", "");
        prefixes.insert(normalized_name);
        prefixes.insert(app.name.to_lowercase());
    }
    
    // Add common CLI tools and system packages that don't have .app bundles
    // but are actively used and should not be considered orphans
    let common_tools = [
        "homebrew", "brew",
        "node", "npm", "pnpm", "yarn",
        "python", "pip", "conda",
        "ruby", "gem", "bundler",
        "git", "gh",
        "docker", "docker-compose",
        "postgres", "postgresql", "mysql", "redis",
        "java", "maven", "gradle",
        "rust", "cargo", "rustup",
        "go", "golang",
        "php", "composer",
        "terraform", "ansible",
        "kubectl", "helm",
        "aws", "gcloud", "azure",
    ];
    
    for tool in &common_tools {
        prefixes.insert(tool.to_string());
    }
    
    prefixes
}

/// Check if a folder name might be associated with a known app
fn is_known_app(name: &str, known_prefixes: &HashSet<String>) -> bool {
    let name_lower = name.to_lowercase();
    let normalized = name_lower.replace(" ", "").replace("-", "").replace("_", "");
    
    // Direct exact match (case-insensitive)
    if known_prefixes.contains(&name_lower) || known_prefixes.contains(&normalized) {
        return true;
    }
    
    // Check if the folder name is a bundle ID that matches
    if name.contains('.') {
        // It's likely a bundle ID like "com.adobe.lightroomCC"
        // Check if it exactly matches any known bundle ID
        if known_prefixes.contains(name) || known_prefixes.contains(&name_lower) {
            return true;
        }
        
        // Check each component of the bundle ID
        for part in name.split('.') {
            let part_lower = part.to_lowercase();
            if known_prefixes.contains(&part_lower) && part.len() > 3 {
                // Found a significant matching component
                return true;
            }
        }
    }
    
    // Check if any known prefix is contained in the folder name
    // or vice versa (but only for longer strings to avoid false positives)
    for prefix in known_prefixes {
        if prefix.len() > 3 && normalized.len() > 3 && (normalized.contains(prefix) || prefix.contains(&normalized)) {
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
fn scan_library_subdir(library_path: &std::path::Path, subdir: &str, orphan_type: OrphanType, known_prefixes: &HashSet<String>) -> Vec<OrphanFile> {
    let mut orphans = Vec::new();
    let dir_path = library_path.join(subdir);
    
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
                
                // Skip common system directories that should not be deleted
                let protected_names = [
                    "Saved Application State",
                    "WebKit",
                    "Safari",
                    "Mail",
                    "Messages",
                    "Calendars",
                    "Keychains",
                    "ColorPickers",
                    "Compositions",
                    "Input Methods",
                    "Keyboard Layouts",
                    "LaunchAgents",
                    "LaunchDaemons",
                    "PreferencePanes",
                    "QuickLook",
                    "Screen Savers",
                    "Services",
                    "Spotlight",
                ];
                
                if protected_names.iter().any(|&p| name == p) {
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
    
    orphans
}

/// Scan for all orphan files (internal)
pub fn scan_orphans_with_custom_paths(apps: Vec<InstalledApp>, library_path: &std::path::Path) -> Vec<OrphanFile> {
    let known_prefixes = get_known_bundle_prefixes(&apps);
    let mut all_orphans = Vec::new();

    all_orphans.extend(scan_library_subdir(library_path, "Application Support", OrphanType::ApplicationSupport, &known_prefixes));
    all_orphans.extend(scan_library_subdir(library_path, "Preferences", OrphanType::Preferences, &known_prefixes));
    all_orphans.extend(scan_library_subdir(library_path, "Containers", OrphanType::Containers, &known_prefixes));
    all_orphans.extend(scan_library_subdir(library_path, "Caches", OrphanType::Caches, &known_prefixes));
    all_orphans.extend(scan_library_subdir(library_path, "Logs", OrphanType::Logs, &known_prefixes));

    all_orphans.sort_by(|a, b| b.size.cmp(&a.size));
    all_orphans
}

/// Scan for all orphan files
pub fn scan_orphan_files() -> Vec<OrphanFile> {
    let apps = scan_installed_apps();
    if let Some(home) = get_home_dir() {
        let library_path = home.join("Library");
        return scan_orphans_with_custom_paths(apps, &library_path);
    }
    Vec::new()
}

/// Delete an orphan file or directory by moving it to trash
pub fn delete_orphan(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    
    if !path.exists() {
        return Ok(());
    }
    
    // Check if we have permission to access the file
    let needs_admin = if let Ok(metadata) = path.metadata() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = metadata.permissions();
            let mode = permissions.mode();
            
            // Check if we have write permission (owner write bit)
            mode & 0o200 == 0
        }
        #[cfg(not(unix))]
        {
            false
        }
    } else {
        false
    };
    
    // Try to move to trash normally first
    match trash::delete(&path) {
        Ok(_) => Ok(()),
        Err(_) if needs_admin => {
            // If normal deletion fails and we detected permission issues,
            // try with admin privileges
            delete_with_admin_privileges(&path)
        }
        Err(_) => {
            // Try admin deletion as fallback for any error
            delete_with_admin_privileges(&path)
        }
    }
}

/// Delete a file with administrator privileges using AppleScript
fn delete_with_admin_privileges(path: &std::path::Path) -> Result<(), String> {
    use std::process::Command;
    
    let path_str = path.to_string_lossy();
    
    // Use AppleScript to request admin privileges and delete the file
    // This will prompt the user for their password
    let script = format!(
        r#"do shell script "rm -rf '{}'" with administrator privileges"#,
        path_str.replace("'", "'\\''") // Escape single quotes
    );
    
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute admin deletion: {}", e))?;
    
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        // Check if user cancelled the password prompt
        if stderr.contains("User canceled") || stderr.contains("-128") {
            Err("Deletion cancelled by user".to_string())
        } else {
            Err(format!(
                "Failed to delete with admin privileges: {}",
                stderr.trim()
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_app_name() {
        assert_eq!(extract_app_name("com.apple.Music"), "Music");
        assert_eq!(extract_app_name("com.openai.ChatGPT"), "ChatGPT");
        assert_eq!(extract_app_name("SimpleApp"), "SimpleApp");
        assert_eq!(extract_app_name("org.videolan.vlc"), "vlc");
    }

    #[test]
    fn test_is_known_app() {
        let mut prefixes = HashSet::new();
        prefixes.insert("com.adobe".to_string());
        prefixes.insert("adobe".to_string());
        prefixes.insert("photoshop".to_string());
        prefixes.insert("cargo".to_string());

        // Exact matches
        assert!(is_known_app("Adobe", &prefixes));
        assert!(is_known_app("Photoshop", &prefixes));
        assert!(is_known_app("cargo", &prefixes));

        // Bundle ID matches
        assert!(is_known_app("com.adobe.Lightroom", &prefixes));
        assert!(is_known_app("com.unknown.Photoshop", &prefixes));

        // Normalized matches
        assert!(is_known_app("Photo Shop", &prefixes)); // Normalized matches "photoshop"

        // False positives
        assert!(!is_known_app("UnknownApp", &prefixes));
        assert!(!is_known_app("com.unknown.app", &prefixes));
    }

    #[test]
    fn test_scan_apps_in_directories() {
        let temp_dir = tempfile::tempdir().unwrap();
        let apps_dir = temp_dir.path().join("Applications");
        fs::create_dir(&apps_dir).unwrap();
        
        // Create FakeApp.app directory
        let app_path = apps_dir.join("FakeApp.app");
        fs::create_dir(&app_path).unwrap();
        
        let apps = scan_apps_in_directories(vec![apps_dir]);
        assert_eq!(apps.len(), 1);
        assert_eq!(apps[0].name, "FakeApp");
    }

    #[test]
    fn test_scan_orphans() {
        let temp_dir = tempfile::tempdir().unwrap();
        let lib_dir = temp_dir.path().join("Library");
        fs::create_dir(&lib_dir).unwrap();
        
        // Create orphan directories
        let app_support = lib_dir.join("Application Support");
        fs::create_dir(&app_support).unwrap();
        let orphan_app_dir = app_support.join("OrphanApp");
        fs::create_dir(&orphan_app_dir).unwrap();
        fs::write(orphan_app_dir.join("data.txt"), "some data").unwrap();
        
        let caches = lib_dir.join("Caches");
        fs::create_dir(&caches).unwrap();
        fs::create_dir(caches.join("OrphanApp")).unwrap();
        
        // Installed apps (does not include OrphanApp)
        let apps = vec![
            InstalledApp {
                name: "RealApp".to_string(),
                bundle_id: "com.real.app".to_string(),
                path: "/Applications/RealApp.app".to_string(),
            }
        ];

        let orphans = scan_orphans_with_custom_paths(apps, &lib_dir);
        
        assert!(orphans.len() >= 1);
        let names: Vec<String> = orphans.iter().map(|o| o.name.clone()).collect();
        assert!(names.contains(&"OrphanApp".to_string()));
    }

    #[test]
    fn test_wrappers_sanity() {
        // Just run them to check they don't panic and exercise code
        let _ = scan_installed_apps();
        let _ = scan_orphan_files();
    }
}
