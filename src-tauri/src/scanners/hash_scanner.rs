use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::PathBuf;
use walkdir::WalkDir;

/// Represents a group of duplicate files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub files: Vec<DuplicateFile>,
    pub file_size: u64,
    pub total_wasted: u64, // (count - 1) * file_size
}

/// Represents a single file in a duplicate group
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateFile {
    pub path: String,
    pub name: String,
}

/// Scan progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ScanProgress {
    pub files_scanned: u64,
    pub duplicates_found: u64,
    pub bytes_wasted: u64,
}

const PARTIAL_HASH_SIZE: usize = 8192; // 8KB for partial hash

/// Calculate SHA-256 hash of a file
fn calculate_full_hash(path: &PathBuf) -> Option<String> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536]; // 64KB buffer
    
    loop {
        let bytes_read = reader.read(&mut buffer).ok()?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    Some(hex::encode(hasher.finalize()))
}

/// Calculate partial hash (first N bytes) for quick comparison
fn calculate_partial_hash(path: &PathBuf) -> Option<String> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; PARTIAL_HASH_SIZE];
    
    let bytes_read = reader.read(&mut buffer).ok()?;
    if bytes_read > 0 {
        hasher.update(&buffer[..bytes_read]);
        Some(hex::encode(hasher.finalize()))
    } else {
        None
    }
}

/// Scan for duplicate files in a directory
pub fn scan_duplicates(directory: &str, min_size_mb: u64) -> Vec<DuplicateGroup> {
    let min_size_bytes = min_size_mb * 1024 * 1024;
    let path = PathBuf::from(directory);
    
    if !path.exists() {
        return Vec::new();
    }
    
    // Step 1: Group files by size
    let mut size_groups: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    
    for entry in WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path().to_path_buf();
        
        // Skip hidden files
        if file_path.file_name().map(|s| s.to_string_lossy().starts_with('.')).unwrap_or(false) {
            continue;
        }
        
        if let Ok(metadata) = std::fs::metadata(&file_path) {
            let size = metadata.len();
            if size >= min_size_bytes {
                size_groups.entry(size).or_default().push(file_path);
            }
        }
    }
    
    // Step 2: For files with same size, compute partial hash
    let mut partial_hash_groups: HashMap<(u64, String), Vec<PathBuf>> = HashMap::new();
    
    for (size, files) in size_groups.iter() {
        if files.len() < 2 {
            continue; // Need at least 2 files to have duplicates
        }
        
        for file_path in files {
            if let Some(partial_hash) = calculate_partial_hash(file_path) {
                partial_hash_groups
                    .entry((*size, partial_hash))
                    .or_default()
                    .push(file_path.clone());
            }
        }
    }
    
    // Step 3: For files with same partial hash, compute full hash
    let mut full_hash_groups: HashMap<String, Vec<PathBuf>> = HashMap::new();
    let mut file_sizes: HashMap<String, u64> = HashMap::new();
    
    for ((size, _), files) in partial_hash_groups.iter() {
        if files.len() < 2 {
            continue;
        }
        
        for file_path in files {
            if let Some(full_hash) = calculate_full_hash(file_path) {
                full_hash_groups
                    .entry(full_hash.clone())
                    .or_default()
                    .push(file_path.clone());
                file_sizes.insert(full_hash, *size);
            }
        }
    }
    
    // Step 4: Build duplicate groups
    let mut duplicates: Vec<DuplicateGroup> = Vec::new();
    
    for (hash, files) in full_hash_groups.iter() {
        if files.len() < 2 {
            continue;
        }
        
        let file_size = *file_sizes.get(hash).unwrap_or(&0);
        let duplicate_files: Vec<DuplicateFile> = files
            .iter()
            .map(|p| DuplicateFile {
                path: p.to_string_lossy().to_string(),
                name: p.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
            })
            .collect();
        
        duplicates.push(DuplicateGroup {
            hash: hash.clone(),
            files: duplicate_files,
            file_size,
            total_wasted: file_size * (files.len() as u64 - 1),
        });
    }
    
    // Sort by wasted space descending
    duplicates.sort_by(|a, b| b.total_wasted.cmp(&a.total_wasted));
    duplicates
}

/// Scan common directories for duplicates
pub fn scan_common_directories_for_duplicates(min_size_mb: u64) -> Vec<DuplicateGroup> {
    let mut all_duplicates = Vec::new();
    
    if let Some(home) = dirs::home_dir() {
        let directories = vec![
            home.join("Downloads"),
            home.join("Desktop"),
            home.join("Documents"),
            home.join("Pictures"),
        ];
        
        // We need to scan all directories together for cross-directory duplicates
        // For now, scan them separately
        for dir in directories {
            if dir.exists() {
                all_duplicates.extend(scan_duplicates(&dir.to_string_lossy(), min_size_mb));
            }
        }
    }
    
    // Sort by wasted space
    all_duplicates.sort_by(|a, b| b.total_wasted.cmp(&a.total_wasted));
    all_duplicates
}

/// Delete a duplicate file
pub fn delete_duplicate(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() && path.is_file() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Move a duplicate file to trash
pub fn move_duplicate_to_trash(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    if path.exists() {
        if let Some(home) = dirs::home_dir() {
            let trash = home.join(".Trash");
            let file_name = path.file_name().ok_or("Invalid file name")?;
            let dest = trash.join(file_name);
            std::fs::rename(&path, &dest).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_calculate_full_hash() {
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "content").unwrap();
        let path = temp_file.path().to_path_buf();
        
        let hash = calculate_full_hash(&path).unwrap();
        // SHA256 of "content"
        assert_eq!(hash, "ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73");
    }

    #[test]
    fn test_calculate_partial_hash() {
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "content").unwrap();
        let path = temp_file.path().to_path_buf();
        
        // SHA256 of "content"
        let expected = "ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73";

        let hash = calculate_partial_hash(&path).unwrap();
        assert_eq!(hash, expected);
    }

    #[test]
    fn test_scan_duplicates() {
        let temp_dir = tempfile::tempdir().unwrap();
        let dir_path = temp_dir.path();

        // Create original file
        let file1_path = dir_path.join("file1.txt");
        let mut f1 = File::create(&file1_path).unwrap();
        write!(f1, "duplicate content").unwrap();

        // Create duplicate file
        let file2_path = dir_path.join("file2.txt");
        let mut f2 = File::create(&file2_path).unwrap();
        write!(f2, "duplicate content").unwrap();

        // Create unique file
        let file3_path = dir_path.join("unique.txt");
        let mut f3 = File::create(&file3_path).unwrap();
        write!(f3, "unique content").unwrap();

        // Min size 0 to catch these small files
        let duplicates = scan_duplicates(dir_path.to_str().unwrap(), 0);

        assert_eq!(duplicates.len(), 1);
        assert_eq!(duplicates[0].files.len(), 2);
        // Order is not guaranteed, check containment below

        // Actually walkdir order is not guaranteed, but we sort duplicates by size then...
        // The implementation sorts files inside scan_duplicates? 
        // No, it just pushes them.
        // Wait, the test might be flaky on file order inside the group.
        // `duplicates[0].files` contains 2 files.
        let names: Vec<String> = duplicates[0].files.iter().map(|f| f.name.clone()).collect();
        assert!(names.contains(&"file1.txt".to_string()));
        assert!(names.contains(&"file2.txt".to_string()));
    }
}
