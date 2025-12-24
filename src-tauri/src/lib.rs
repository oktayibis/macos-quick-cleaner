// macOS Quick Cleaner - Rust Backend
// A powerful disk cleanup and optimization utility for macOS

mod commands;
mod scanners;

use commands::{cache, developer, duplicates, large_files, leftovers, system_info};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Cache commands
            cache::scan_user_caches,
            cache::scan_system_caches,
            cache::scan_all_caches,
            cache::delete_cache,
            cache::get_total_cache_size,
            // Developer commands
            developer::scan_developer_caches,
            developer::clean_developer_cache,
            developer::get_total_developer_cache_size,
            developer::is_developer_user,
            // Leftover commands
            leftovers::scan_installed_apps,
            leftovers::scan_orphan_files,
            leftovers::delete_orphan,
            leftovers::get_orphan_total_size,
            // Large files commands
            large_files::scan_large_files,
            large_files::scan_common_large_files,
            large_files::delete_file,
            large_files::move_file_to_trash,
            // Duplicate commands
            duplicates::scan_duplicates,
            duplicates::scan_common_duplicates,
            duplicates::delete_duplicate,
            duplicates::move_duplicate_to_trash,
            duplicates::get_duplicates_wasted_space,
            // System info commands
            system_info::get_system_info,
            system_info::get_disk_usage_info,
            system_info::format_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
