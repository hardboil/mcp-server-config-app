use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServer {
    pub command: String,
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpConfig {
    #[serde(rename = "mcpServers")]
    pub mcp_servers: HashMap<String, McpServer>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub saved_servers: Vec<(String, McpServer)>,
    pub last_directory: Option<String>,
}

#[tauri::command]
async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    app.dialog()
        .file()
        .set_title("Select Project Directory")
        .pick_folder(move |folder| {
            let _ = tx.send(folder);
        });

    match rx.recv().map_err(|e| e.to_string())? {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_mcp_config(directory: String, config: McpConfig) -> Result<(), String> {
    let config_path = PathBuf::from(&directory).join(".mcp.json");

    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json_string)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_mcp_config(directory: String) -> Result<Option<McpConfig>, String> {
    let config_path = PathBuf::from(&directory).join(".mcp.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: McpConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(Some(config))
}

#[tauri::command]
async fn load_app_config(app: AppHandle) -> Result<AppConfig, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let config_path = app_dir.join("config.json");

    if !config_path.exists() {
        return Ok(AppConfig {
            saved_servers: Vec::new(),
            last_directory: None,
        });
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read app config: {}", e))?;

    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse app config: {}", e))?;

    Ok(config)
}

#[tauri::command]
async fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let config_path = app_dir.join("config.json");

    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize app config: {}", e))?;

    fs::write(&config_path, json_string)
        .map_err(|e| format!("Failed to write app config: {}", e))?;

    Ok(())
}

#[tauri::command]
fn validate_mcp_config(config: McpConfig) -> Result<(), String> {
    if config.mcp_servers.is_empty() {
        return Err("At least one MCP server must be configured".to_string());
    }

    for (name, server) in &config.mcp_servers {
        if name.is_empty() {
            return Err("Server name cannot be empty".to_string());
        }

        if server.command.is_empty() {
            return Err(format!("Command for server '{}' cannot be empty", name));
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            select_directory,
            save_mcp_config,
            load_mcp_config,
            load_app_config,
            save_app_config,
            validate_mcp_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
