use crate::scanners::cache_scanner::{self, CacheEntry};
use tauri::command;

/// Scan user caches (~Library/Caches)
#[command]
pub async fn scan_user_caches() -> Result<Vec<CacheEntry>, String> {
    Ok(cache_scanner::scan_user_caches())
}

/// Scan system caches (/Library/Caches)
#[command]
pub async fn scan_system_caches() -> Result<Vec<CacheEntry>, String> {
    Ok(cache_scanner::scan_system_caches())
}

/// Scan all caches
#[command]
pub async fn scan_all_caches() -> Result<Vec<CacheEntry>, String> {
    Ok(cache_scanner::scan_all_caches())
}

/// Delete a specific cache
#[command]
pub async fn delete_cache(path: String) -> Result<(), String> {
    cache_scanner::delete_cache(&path)
}

/// Get total cache size
#[command]
pub async fn get_total_cache_size() -> Result<u64, String> {
    let caches = cache_scanner::scan_all_caches();
    Ok(caches.iter().map(|c| c.size).sum())
}
