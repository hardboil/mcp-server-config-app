import { invoke } from "@tauri-apps/api/core";
import { toast } from "./toast";

interface McpServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServer>;
}

interface AppConfig {
  saved_servers: Array<[string, McpServer]>;
  last_directory?: string;
}

class McpConfigApp {
  private currentDirectory: string = "";
  private currentConfig: McpConfig = { mcpServers: {} };
  private appConfig: AppConfig = { saved_servers: [] };
  private editingServerKey: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadAppConfig();
    this.setupEventListeners();
    this.renderSavedServers();
    
    if (this.appConfig.last_directory) {
      this.currentDirectory = this.appConfig.last_directory;
      document.querySelector<HTMLInputElement>("#directory-input")!.value = this.currentDirectory;
      await this.loadExistingConfig();
    }
  }

  async loadAppConfig() {
    try {
      this.appConfig = await invoke("load_app_config");
    } catch (error) {
      console.error("Failed to load app config:", error);
      toast.error("Failed to load app configuration");
    }
  }

  async saveAppConfig() {
    try {
      await invoke("save_app_config", { config: this.appConfig });
    } catch (error) {
      console.error("Failed to save app config:", error);
      toast.error("Failed to save app configuration");
    }
  }

  setupEventListeners() {
    // Directory selection
    document.getElementById("select-directory-btn")!.addEventListener("click", async () => {
      try {
        const directory = await invoke<string | null>("select_directory");
        if (directory) {
          this.currentDirectory = directory;
          document.querySelector<HTMLInputElement>("#directory-input")!.value = directory;
          this.appConfig.last_directory = directory;
          await this.saveAppConfig();
          await this.loadExistingConfig();
        }
      } catch (error) {
        console.error("Failed to select directory:", error);
        toast.error("Failed to select directory");
      }
    });

    // Add server button
    document.getElementById("add-server-btn")!.addEventListener("click", () => {
      this.showServerModal();
    });

    // JSON Editor button
    document.getElementById("json-editor-btn")!.addEventListener("click", () => {
      this.showJsonEditor();
    });

    // Server form submission
    document.getElementById("server-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleServerFormSubmit();
    });

    // Server save button (for JSON tab)
    document.getElementById("server-save-btn")!.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleServerFormSubmit();
    });

    // JSON Editor events
    document.getElementById("json-editor-textarea")!.addEventListener("input", () => {
      this.updateJsonPreview();
    });

    document.getElementById("json-format-btn")!.addEventListener("click", () => {
      this.formatJsonEditor();
    });

    document.getElementById("json-load-current-btn")!.addEventListener("click", () => {
      this.loadCurrentConfigToJsonEditor();
    });

    document.getElementById("json-apply-btn")!.addEventListener("click", () => {
      this.applyJsonConfiguration();
    });

    // Single server JSON editor events
    document.getElementById("single-server-json")!.addEventListener("input", () => {
      this.updateSingleServerJsonValidation();
    });

    document.getElementById("single-server-format-btn")!.addEventListener("click", () => {
      this.formatSingleServerJson();
    });

    document.getElementById("single-server-sync-to-form-btn")!.addEventListener("click", () => {
      this.syncJsonToForm();
    });


    // Validate button
    document.getElementById("validate-btn")!.addEventListener("click", async () => {
      await this.validateConfiguration();
    });

    // Save config button
    document.getElementById("save-config-btn")!.addEventListener("click", async () => {
      await this.saveConfiguration();
    });
  }

  async loadExistingConfig() {
    if (!this.currentDirectory) return;

    try {
      const config = await invoke<McpConfig | null>("load_mcp_config", { directory: this.currentDirectory });
      if (config) {
        this.currentConfig = config;
        this.renderCurrentServers();
        toast.success("Existing configuration loaded");
      } else {
        this.currentConfig = { mcpServers: {} };
        this.renderCurrentServers();
      }
    } catch (error) {
      console.error("Failed to load existing config:", error);
      toast.error("Failed to load existing configuration");
    }
  }

  showServerModal(serverKey?: string) {
    this.editingServerKey = serverKey || null;
    const modal = document.getElementById("server-modal") as HTMLDialogElement;
    const title = document.getElementById("modal-title")!;
    const form = document.getElementById("server-form") as HTMLFormElement;
    
    form.reset();
    
    if (serverKey) {
      title.textContent = "Edit Server";
      const server = this.currentConfig.mcpServers[serverKey];
      (document.getElementById("server-name") as HTMLInputElement).value = serverKey;
      (document.getElementById("server-command") as HTMLInputElement).value = server.command;
      (document.getElementById("server-args") as HTMLTextAreaElement).value = server.args && server.args.length > 0 ? server.args.join("\n") : "";
      (document.getElementById("server-env") as HTMLTextAreaElement).value = server.env ? JSON.stringify(server.env, null, 2) : "";
    } else {
      title.textContent = "Add Server";
      // Clear JSON editor
      (document.getElementById("single-server-json") as HTMLTextAreaElement).value = "";
    }
    
    modal.showModal();
    
    // Reset tabs to JSON view after modal is shown
    setTimeout(() => {
      this.switchServerModalTab('json');
      if (serverKey) {
        // Update JSON editor with current data after tab switch
        this.syncFormToJson();
      }
    }, 100);
  }

  hideServerModal() {
    (document.getElementById("server-modal") as HTMLDialogElement).close();
    this.editingServerKey = null;
  }

  async handleServerFormSubmit() {
    // Check if we're in JSON tab and should use JSON data
    const jsonTab = document.getElementById('tab-json')!;
    const isJsonTabActive = jsonTab.classList.contains('tab-active');
    
    let name: string, command: string, args: string[], env: Record<string, string> | undefined;
    
    if (isJsonTabActive) {
      // Parse from JSON
      const jsonTextarea = document.getElementById("single-server-json") as HTMLTextAreaElement;
      const jsonText = jsonTextarea.value.trim();
      
      if (!jsonText) {
        toast.error("JSON을 입력해주세요");
        return;
      }
      
      try {
        const config = JSON.parse(jsonText);
        
        // Handle mcpServers structure format
        if (config.mcpServers && typeof config.mcpServers === 'object') {
          const serverNames = Object.keys(config.mcpServers);
          if (serverNames.length === 0) {
            toast.error("No servers found in mcpServers");
            return;
          }
          
          // Use the first server for editing
          const serverName = serverNames[0];
          const serverConfig = config.mcpServers[serverName];
          
          if (!serverConfig.command) {
            toast.error("command field is required");
            return;
          }
          
          name = serverName;
          command = serverConfig.command;
          args = serverConfig.args && Array.isArray(serverConfig.args) ? serverConfig.args : [];
          env = serverConfig.env && typeof serverConfig.env === 'object' ? serverConfig.env : undefined;
          
        } else {
          // Legacy format - backward compatibility
          if (!config.name || !config.command) {
            toast.error("name and command fields are required in JSON");
            return;
          }
          
          name = config.name;
          command = config.command;
          args = config.args && Array.isArray(config.args) ? config.args : [];
          env = config.env && typeof config.env === 'object' ? config.env : undefined;
        }
        
      } catch (error) {
        toast.error(`JSON 파싱 실패: ${error.message}`);
        return;
      }
    } else {
      // Parse from form
      name = (document.getElementById("server-name") as HTMLInputElement).value;
      command = (document.getElementById("server-command") as HTMLInputElement).value;
      const argsText = (document.getElementById("server-args") as HTMLTextAreaElement).value;
      const envText = (document.getElementById("server-env") as HTMLTextAreaElement).value;

      if (!name || !command) {
        toast.error("Server name and command are required");
        return;
      }

      args = argsText.split("\n").filter(arg => arg.trim() !== "");

      if (envText.trim()) {
        try {
          env = JSON.parse(envText);
        } catch (error) {
          toast.error("Invalid JSON format for environment variables");
          return;
        }
      }
    }

    const server: McpServer = { command };
    
    // Only add args if there are actual arguments
    if (args.length > 0) {
      server.args = args;
    }
    
    // Only add env if there are environment variables
    if (env) {
      server.env = env;
    }

    // Check if editing a saved server
    if (this.editingServerKey && this.editingServerKey.startsWith('saved:')) {
      const originalName = this.editingServerKey.replace('saved:', '');
      const savedIndex = this.appConfig.saved_servers.findIndex(([savedName]) => savedName === originalName);
      
      if (savedIndex !== -1) {
        // Remove old entry if name changed
        if (originalName !== name) {
          this.appConfig.saved_servers.splice(savedIndex, 1);
        } else {
          // Update existing entry
          this.appConfig.saved_servers[savedIndex] = [name, server];
        }
      }
      
      // Add/update saved server
      const existingIndex = this.appConfig.saved_servers.findIndex(([savedName]) => savedName === name);
      if (existingIndex === -1) {
        this.appConfig.saved_servers.push([name, server]);
      } else if (originalName !== name) {
        this.appConfig.saved_servers[existingIndex] = [name, server];
      }
      
      await this.saveAppConfig();
      this.renderSavedServers();
      this.hideServerModal();
      toast.success("Saved server updated");
      return;
    }

    // Handle current server editing
    if (this.editingServerKey && this.editingServerKey !== name) {
      delete this.currentConfig.mcpServers[this.editingServerKey];
    }

    this.currentConfig.mcpServers[name] = server;
    
    // Save to saved servers if not already there
    const existingIndex = this.appConfig.saved_servers.findIndex(([savedName]) => savedName === name);
    if (existingIndex === -1) {
      this.appConfig.saved_servers.push([name, server]);
    } else {
      this.appConfig.saved_servers[existingIndex] = [name, server];
    }

    await this.saveAppConfig();
    this.renderCurrentServers();
    this.renderSavedServers();
    this.hideServerModal();
    toast.success("Server configuration saved");
  }

  renderCurrentServers() {
    const container = document.getElementById("servers-container")!;
    container.innerHTML = "";

    for (const [name, server] of Object.entries(this.currentConfig.mcpServers)) {
      const serverDiv = document.createElement("div");
      
      const argsStr = server.args && server.args.length > 0 ? server.args.join(" ") : "";
      const envStr = server.env ? `(${Object.keys(server.env).length} env vars)` : "";
      
      serverDiv.innerHTML = `
        <div class="card bg-base-200 shadow-md">
          <div class="card-body p-4">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-primary">${name}</h3>
                <p class="text-sm text-base-content/70 break-all">${server.command} ${argsStr} ${envStr}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="app.editServer('${name}')" class="btn btn-sm btn-outline btn-primary">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span class="hidden sm:inline">Edit</span>
                </button>
                <button onclick="app.removeServer('${name}')" class="btn btn-sm btn-outline btn-error">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span class="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(serverDiv);
    }

    this.updateSaveButtonState();
  }

  updateSaveButtonState() {
    const saveBtn = document.getElementById("save-config-btn") as HTMLButtonElement;
    const hasServers = Object.keys(this.currentConfig.mcpServers).length > 0;
    
    saveBtn.disabled = !this.currentDirectory;
    
    if (hasServers) {
      // Save mode
      saveBtn.textContent = "Save .mcp.json";
      saveBtn.className = "btn btn-success";
      saveBtn.innerHTML = `
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
        </svg>
        Save .mcp.json
      `;
    } else {
      // Clear mode
      saveBtn.textContent = "Clear .mcp.json";
      saveBtn.className = "btn btn-warning";
      saveBtn.innerHTML = `
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        Clear .mcp.json
      `;
    }
  }

  renderSavedServers() {
    const container = document.getElementById("saved-servers-container")!;
    container.innerHTML = "";

    for (const [name, server] of this.appConfig.saved_servers) {
      const serverDiv = document.createElement("div");
      
      const argsStr = server.args && server.args.length > 0 ? server.args.join(" ") : "";
      
      serverDiv.innerHTML = `
        <div class="card bg-base-200 shadow-md">
          <div class="card-body p-3">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div class="flex-1">
                <span class="font-semibold text-primary">${name}</span>
                <span class="text-sm text-base-content/70 ml-2 break-all">${server.command} ${argsStr}</span>
              </div>
              <div class="flex gap-2">
                <button onclick="app.addSavedServer('${name}')" class="btn btn-sm btn-outline btn-secondary">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span class="hidden sm:inline">Add to Current</span>
                  <span class="sm:hidden">Add</span>
                </button>
                <button onclick="app.editSavedServer('${name}')" class="btn btn-sm btn-outline btn-primary">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span class="hidden sm:inline">Edit</span>
                </button>
                <button onclick="app.deleteSavedServer('${name}')" class="btn btn-sm btn-outline btn-error">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span class="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(serverDiv);
    }
  }

  editServer(serverKey: string) {
    this.showServerModal(serverKey);
  }

  removeServer(serverKey: string) {
    if (confirm(`Are you sure you want to remove server "${serverKey}"?`)) {
      delete this.currentConfig.mcpServers[serverKey];
      this.renderCurrentServers();
      toast.success(`Server "${serverKey}" removed`);
    }
  }

  addSavedServer(serverName: string) {
    const savedServer = this.appConfig.saved_servers.find(([name]) => name === serverName);
    if (savedServer) {
      this.currentConfig.mcpServers[savedServer[0]] = savedServer[1];
      this.renderCurrentServers();
      toast.success(`Server "${serverName}" added to current configuration`);
    }
  }

  async validateConfiguration() {
    if (Object.keys(this.currentConfig.mcpServers).length === 0) {
      toast.error("No servers configured");
      return;
    }

    try {
      await invoke("validate_mcp_config", { config: this.currentConfig });
      toast.success("Configuration is valid");
    } catch (error) {
      toast.error(`Validation failed: ${error}`);
    }
  }

  async saveConfiguration() {
    if (!this.currentDirectory) {
      toast.error("Please select a directory first");
      return;
    }

    // Check if there are no MCP servers configured
    if (Object.keys(this.currentConfig.mcpServers).length === 0) {
      const shouldClear = confirm(
        "현재 설정된 MCP 서버가 없습니다.\n" +
        ".mcp.json 파일의 내용을 비우시겠습니까?\n\n" +
        "확인: 파일 내용 비우기\n" +
        "취소: 작업 취소"
      );
      
      if (!shouldClear) {
        return;
      }
      
      try {
        // Save empty config to clear the file contents
        const emptyConfig = { mcpServers: {} };
        await invoke("save_mcp_config", { directory: this.currentDirectory, config: emptyConfig });
        toast.success(".mcp.json 파일 내용이 비워졌습니다");
      } catch (error) {
        toast.error(`파일 내용 비우기 실패: ${error}`);
      }
      return;
    }

    try {
      // Clean up config before saving - remove null/empty env values
      const cleanConfig = this.cleanupConfig(this.currentConfig);
      await invoke("save_mcp_config", { directory: this.currentDirectory, config: cleanConfig });
      toast.success("Configuration saved successfully");
    } catch (error) {
      toast.error(`Failed to save configuration: ${error}`);
    }
  }

  private cleanupConfig(config: McpConfig): McpConfig {
    const cleanedConfig: McpConfig = { mcpServers: {} };
    
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const cleanedServer: any = { command: server.command };
      
      // Only add args if they exist and have length > 0
      if (server.args && server.args.length > 0) {
        cleanedServer.args = server.args;
      }
      
      // Only add env if it exists and is not null/empty
      if (server.env && server.env !== null && typeof server.env === 'object' && Object.keys(server.env).length > 0) {
        cleanedServer.env = server.env;
      }
      
      cleanedConfig.mcpServers[name] = cleanedServer;
    }
    
    return cleanedConfig;
  }

  showJsonEditor() {
    const modal = document.getElementById("json-editor-modal") as HTMLDialogElement;
    modal.showModal();
  }

  updateJsonPreview() {
    const textarea = document.getElementById("json-editor-textarea") as HTMLTextAreaElement;
    const preview = document.getElementById("json-preview")!;
    const errorDisplay = document.getElementById("json-error-display")!;
    
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
      preview.innerHTML = '<p class="text-sm text-base-content/70">JSON을 입력하면 여기에 미리보기가 표시됩니다.</p>';
      errorDisplay.classList.add('hidden');
      return;
    }

    try {
      const config = JSON.parse(jsonText) as McpConfig;
      
      // Validate structure
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        throw new Error('Invalid structure: mcpServers field is required');
      }

      errorDisplay.classList.add('hidden');
      
      // Show preview
      const serverCount = Object.keys(config.mcpServers).length;
      let previewHtml = `<div class="space-y-2">`;
      
      if (serverCount === 0) {
        previewHtml += '<p class="text-sm text-base-content/70">No servers configured</p>';
      } else {
        previewHtml += `<p class="text-sm font-semibold text-success">${serverCount} server(s) configured:</p>`;
        
        for (const [name, server] of Object.entries(config.mcpServers)) {
          const argsStr = server.args && server.args.length > 0 ? server.args.join(' ') : '';
          const envCount = server.env ? Object.keys(server.env).length : 0;
          const envStr = envCount > 0 ? `(${envCount} env vars)` : '';
          
          previewHtml += `
            <div class="bg-base-100 rounded p-2 border">
              <div class="font-semibold text-primary">${name}</div>
              <div class="text-sm text-base-content/70">${server.command} ${argsStr} ${envStr}</div>
            </div>
          `;
        }
      }
      
      previewHtml += '</div>';
      preview.innerHTML = previewHtml;
      
    } catch (error) {
      errorDisplay.classList.remove('hidden');
      preview.innerHTML = `<div class="text-error text-sm">JSON 오류: ${error.message}</div>`;
    }
  }

  formatJsonEditor() {
    const textarea = document.getElementById("json-editor-textarea") as HTMLTextAreaElement;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
      toast.warning("JSON을 입력해주세요");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      textarea.value = JSON.stringify(parsed, null, 2);
      this.updateJsonPreview();
      toast.success("JSON 포맷팅 완료");
    } catch (error) {
      toast.error(`JSON 포맷팅 실패: ${error.message}`);
    }
  }

  loadCurrentConfigToJsonEditor() {
    const textarea = document.getElementById("json-editor-textarea") as HTMLTextAreaElement;
    textarea.value = JSON.stringify(this.currentConfig, null, 2);
    this.updateJsonPreview();
    toast.success("현재 설정을 불러왔습니다");
  }

  async applyJsonConfiguration() {
    const textarea = document.getElementById("json-editor-textarea") as HTMLTextAreaElement;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
      toast.error("JSON을 입력해주세요");
      return;
    }

    try {
      const config = JSON.parse(jsonText) as McpConfig;
      
      // Validate structure
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        throw new Error('Invalid structure: mcpServers field is required');
      }

      // Validate each server
      for (const [name, server] of Object.entries(config.mcpServers)) {
        if (!server.command || typeof server.command !== 'string') {
          throw new Error(`Server '${name}': command is required and must be a string`);
        }
        if (server.args && !Array.isArray(server.args)) {
          throw new Error(`Server '${name}': args must be an array`);
        }
        if (server.env && typeof server.env !== 'object') {
          throw new Error(`Server '${name}': env must be an object`);
        }
      }

      // Apply configuration
      this.currentConfig = config;
      
      // Update saved servers
      for (const [name, server] of Object.entries(config.mcpServers)) {
        const existingIndex = this.appConfig.saved_servers.findIndex(([savedName]) => savedName === name);
        if (existingIndex === -1) {
          this.appConfig.saved_servers.push([name, server]);
        } else {
          this.appConfig.saved_servers[existingIndex] = [name, server];
        }
      }
      
      await this.saveAppConfig();
      this.renderCurrentServers();
      this.renderSavedServers();
      
      // Close modal
      (document.getElementById("json-editor-modal") as HTMLDialogElement).close();
      
      toast.success(`${Object.keys(config.mcpServers).length}개의 서버 설정이 적용되었습니다`);
      
    } catch (error) {
      toast.error(`JSON 적용 실패: ${error.message}`);
    }
  }

  editSavedServer(serverName: string) {
    const savedServer = this.appConfig.saved_servers.find(([name]) => name === serverName);
    if (savedServer) {
      // Set editing mode for saved server
      this.editingServerKey = `saved:${savedServer[0]}`;
      const modal = document.getElementById("server-modal") as HTMLDialogElement;
      const title = document.getElementById("modal-title")!;
      const form = document.getElementById("server-form") as HTMLFormElement;
      
      form.reset();
      title.textContent = "Edit Saved Server";
      
      const [name, server] = savedServer;
      (document.getElementById("server-name") as HTMLInputElement).value = name;
      (document.getElementById("server-command") as HTMLInputElement).value = server.command;
      (document.getElementById("server-args") as HTMLTextAreaElement).value = server.args && server.args.length > 0 ? server.args.join("\n") : "";
      (document.getElementById("server-env") as HTMLTextAreaElement).value = server.env ? JSON.stringify(server.env, null, 2) : "";
      
      modal.showModal();
      
      // Reset tabs to JSON view after modal is shown
      setTimeout(() => {
        this.switchServerModalTab('json');
        // Update JSON editor with current data after tab switch
        this.syncFormToJson();
      }, 100);
    }
  }

  async deleteSavedServer(serverName: string) {
    if (confirm(`정말로 저장된 서버 "${serverName}"를 삭제하시겠습니까?`)) {
      const index = this.appConfig.saved_servers.findIndex(([name]) => name === serverName);
      if (index !== -1) {
        this.appConfig.saved_servers.splice(index, 1);
        await this.saveAppConfig();
        this.renderSavedServers();
        toast.success(`저장된 서버 "${serverName}"이 삭제되었습니다`);
      }
    }
  }

  switchServerModalTab(tab: 'form' | 'json') {
    const formTab = document.getElementById('tab-form');
    const jsonTab = document.getElementById('tab-json');
    const formContent = document.getElementById('form-tab-content');
    const jsonContent = document.getElementById('json-tab-content');
    
    console.log('Switching to tab:', tab);
    console.log('Elements found:', {
      formTab: !!formTab,
      jsonTab: !!jsonTab,
      formContent: !!formContent,
      jsonContent: !!jsonContent
    });
    
    if (!formTab || !jsonTab || !formContent || !jsonContent) {
      console.error('Could not find tab elements');
      return;
    }
    
    if (tab === 'form') {
      formTab.classList.add('tab-active');
      jsonTab.classList.remove('tab-active');
      formContent.style.display = 'block';
      formContent.style.visibility = 'visible';
      jsonContent.style.display = 'none';
      jsonContent.style.visibility = 'hidden';
      console.log('Switched to form tab');
    } else {
      formTab.classList.remove('tab-active');
      jsonTab.classList.add('tab-active');
      formContent.style.display = 'none';
      formContent.style.visibility = 'hidden';
      jsonContent.style.display = 'block';
      jsonContent.style.visibility = 'visible';
      console.log('Switched to JSON tab');
      
      // Auto-sync form data to JSON when switching to JSON tab
      this.syncFormToJson();
    }
  }

  syncFormToJson() {
    const name = (document.getElementById("server-name") as HTMLInputElement).value;
    const command = (document.getElementById("server-command") as HTMLInputElement).value;
    const argsText = (document.getElementById("server-args") as HTMLTextAreaElement).value;
    const envText = (document.getElementById("server-env") as HTMLTextAreaElement).value;
    
    const serverConfig: any = { command };
    
    // Only add args if there are actual arguments
    if (argsText.trim()) {
      const args = argsText.split("\n").filter(arg => arg.trim() !== "");
      if (args.length > 0) {
        serverConfig.args = args;
      }
    }
    
    // Only add env if there are environment variables
    if (envText.trim()) {
      try {
        const env = JSON.parse(envText);
        if (env && typeof env === 'object' && Object.keys(env).length > 0) {
          serverConfig.env = env;
        }
      } catch (error) {
        // If env is invalid JSON, keep it as string in the JSON editor
        serverConfig.env = envText;
      }
    }
    
    // Format as mcpServers structure
    const mcpServersConfig = {
      mcpServers: {
        [name]: serverConfig
      }
    };
    
    const jsonTextarea = document.getElementById("single-server-json") as HTMLTextAreaElement;
    jsonTextarea.value = JSON.stringify(mcpServersConfig, null, 2);
    this.updateSingleServerJsonValidation();
  }

  syncJsonToForm() {
    const jsonTextarea = document.getElementById("single-server-json") as HTMLTextAreaElement;
    const jsonText = jsonTextarea.value.trim();
    
    if (!jsonText) {
      toast.warning("JSON을 입력해주세요");
      return;
    }
    
    try {
      const config = JSON.parse(jsonText);
      
      // Handle mcpServers structure format
      if (config.mcpServers && typeof config.mcpServers === 'object') {
        const serverNames = Object.keys(config.mcpServers);
        if (serverNames.length === 0) {
          throw new Error('No servers found in mcpServers');
        }
        
        // Use the first server for editing
        const serverName = serverNames[0];
        const serverConfig = config.mcpServers[serverName];
        
        if (!serverConfig.command) {
          throw new Error('command field is required');
        }
        
        // Update form fields
        (document.getElementById("server-name") as HTMLInputElement).value = serverName;
        (document.getElementById("server-command") as HTMLInputElement).value = serverConfig.command;
        
        const argsTextarea = document.getElementById("server-args") as HTMLTextAreaElement;
        if (serverConfig.args && Array.isArray(serverConfig.args) && serverConfig.args.length > 0) {
          argsTextarea.value = serverConfig.args.join("\n");
        } else {
          argsTextarea.value = "";
        }
        
        const envTextarea = document.getElementById("server-env") as HTMLTextAreaElement;
        if (serverConfig.env && typeof serverConfig.env === 'object') {
          envTextarea.value = JSON.stringify(serverConfig.env, null, 2);
        } else {
          envTextarea.value = "";
        }
        
      } else {
        // Legacy format - backward compatibility
        if (!config.name || !config.command) {
          throw new Error('name and command fields are required');
        }
        
        // Update form fields
        (document.getElementById("server-name") as HTMLInputElement).value = config.name || "";
        (document.getElementById("server-command") as HTMLInputElement).value = config.command || "";
        
        const argsTextarea = document.getElementById("server-args") as HTMLTextAreaElement;
        if (config.args && Array.isArray(config.args) && config.args.length > 0) {
          argsTextarea.value = config.args.join("\n");
        } else {
          argsTextarea.value = "";
        }
        
        const envTextarea = document.getElementById("server-env") as HTMLTextAreaElement;
        if (config.env && typeof config.env === 'object') {
          envTextarea.value = JSON.stringify(config.env, null, 2);
        } else {
          envTextarea.value = "";
        }
      }
      
      // Switch to form tab to show the updated fields
      this.switchServerModalTab('form');
      toast.success("JSON 설정이 폼에 적용되었습니다");
      
    } catch (error) {
      toast.error(`JSON 파싱 실패: ${error.message}`);
    }
  }

  updateSingleServerJsonValidation() {
    const textarea = document.getElementById("single-server-json") as HTMLTextAreaElement;
    const errorDisplay = document.getElementById("single-server-json-error")!;
    
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
      errorDisplay.classList.add('hidden');
      return;
    }
    
    try {
      const config = JSON.parse(jsonText);
      
      // Validate mcpServers structure
      if (config.mcpServers && typeof config.mcpServers === 'object') {
        const serverNames = Object.keys(config.mcpServers);
        if (serverNames.length === 0) {
          throw new Error('No servers found in mcpServers');
        }
        
        // Validate each server
        for (const [name, server] of Object.entries(config.mcpServers)) {
          if (!server || typeof server !== 'object') {
            throw new Error(`Server '${name}' must be an object`);
          }
          
          if (!(server as any).command) {
            throw new Error(`Server '${name}': command field is required`);
          }
          
          if ((server as any).args && !Array.isArray((server as any).args)) {
            throw new Error(`Server '${name}': args must be an array`);
          }
          
          if ((server as any).env && typeof (server as any).env !== 'object') {
            throw new Error(`Server '${name}': env must be an object`);
          }
        }
      } else {
        // Legacy format validation
        if (!config.name || !config.command) {
          throw new Error('name and command fields are required');
        }
        
        if (config.args && !Array.isArray(config.args)) {
          throw new Error('args must be an array');
        }
        
        if (config.env && typeof config.env !== 'object') {
          throw new Error('env must be an object');
        }
      }
      
      errorDisplay.classList.add('hidden');
      
    } catch (error) {
      errorDisplay.classList.remove('hidden');
    }
  }

  formatSingleServerJson() {
    const textarea = document.getElementById("single-server-json") as HTMLTextAreaElement;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
      toast.warning("JSON을 입력해주세요");
      return;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      textarea.value = JSON.stringify(parsed, null, 2);
      this.updateSingleServerJsonValidation();
      toast.success("JSON 포맷팅 완료");
    } catch (error) {
      toast.error(`JSON 포맷팅 실패: ${error.message}`);
    }
  }

}

// Global app instance
let app: McpConfigApp;

// Theme switching function
function setTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Load saved theme
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  app = new McpConfigApp();
  (window as any).app = app; // Make app globally accessible for inline event handlers
  (window as any).setTheme = setTheme; // Make setTheme globally accessible
  
  // Debug function for tab testing
  (window as any).testJsonTab = () => {
    const jsonContent = document.getElementById('json-tab-content');
    console.log('JSON content element:', jsonContent);
    console.log('JSON content display:', jsonContent?.style.display);
    console.log('JSON content visibility:', jsonContent?.style.visibility);
    console.log('JSON content computed style:', window.getComputedStyle(jsonContent!).display);
  };
});