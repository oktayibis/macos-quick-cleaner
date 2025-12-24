use serde::{Deserialize, Serialize};

use tauri::command;

/// Disk usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsage {
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub used_percentage: f64,
}

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os_version: String,
    pub hostname: String,
    pub username: String,
    pub home_directory: String,
    pub disk_usage: DiskUsage,
}

/// Get disk usage for the root volume
fn get_disk_usage() -> DiskUsage {
    // Use statvfs to get disk info
    #[cfg(target_os = "macos")]
    {
        use std::ffi::CString;
        use std::mem::MaybeUninit;
        
        let path = CString::new("/").unwrap();
        let mut stat: MaybeUninit<libc::statvfs> = MaybeUninit::uninit();
        
        unsafe {
            if libc::statvfs(path.as_ptr(), stat.as_mut_ptr()) == 0 {
                let stat = stat.assume_init();
                let block_size = stat.f_frsize;
                let total = stat.f_blocks as u64 * block_size;
                let free = stat.f_bavail as u64 * block_size;
                let used = total - free;
                let percentage = (used as f64 / total as f64) * 100.0;
                
                return DiskUsage {
                    total_bytes: total,
                    free_bytes: free,
                    used_bytes: used,
                    used_percentage: percentage,
                };
            }
        }
    }
    
    // Fallback
    DiskUsage {
        total_bytes: 0,
        free_bytes: 0,
        used_bytes: 0,
        used_percentage: 0.0,
    }
}

/// Get system information
#[command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let username = std::env::var("USER").unwrap_or_else(|_| "Unknown".to_string());
    
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());
    
    Ok(SystemInfo {
        os_version: "macOS".to_string(),
        hostname,
        username,
        home_directory: home_dir,
        disk_usage: get_disk_usage(),
    })
}

/// Get disk usage
#[command]
pub async fn get_disk_usage_info() -> Result<DiskUsage, String> {
    Ok(get_disk_usage())
}

/// Format bytes to human-readable string
#[command]
pub async fn format_bytes(bytes: u64) -> Result<String, String> {
    let kb = 1024_u64;
    let mb = kb * 1024;
    let gb = mb * 1024;
    let tb = gb * 1024;
    
    let result = if bytes >= tb {
        format!("{:.2} TB", bytes as f64 / tb as f64)
    } else if bytes >= gb {
        format!("{:.2} GB", bytes as f64 / gb as f64)
    } else if bytes >= mb {
        format!("{:.2} MB", bytes as f64 / mb as f64)
    } else if bytes >= kb {
        format!("{:.2} KB", bytes as f64 / kb as f64)
    } else {
        format!("{} B", bytes)
    };
    
    Ok(result)
}
