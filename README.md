# MCP Server Configuration App

A desktop application built with Tauri for managing MCP (Model Context Protocol) server configurations for Claude Code users.

> 🤖 **Developed with Claude Code** - This application was built using [Claude Code](https://claude.ai/code), Anthropic's AI-powered development environment.

> 🌍 **Language**: [English](README.md) | [한국어](README.ko.md)

## 📋 Key Features

### 🎯 Core Functionality
- **MCP Configuration File Generation**: Automatically creates project-scoped `.mcp.json` files in selected directories
- **Real-time Configuration Validation**: Live syntax and structure validation for MCP server settings
- **Server Library Management**: Save and reuse MCP server configurations across different projects
- **Intuitive GUI Interface**: Manage MCP settings without command-line interaction

### 🛠️ Technical Features
- **Directory Selection**: Native file dialogs for project folder selection
- **Live Editing**: Modal-based server configuration with add/edit/delete operations
- **Persistent Storage**: Automatic saving of user settings and server libraries
- **Schema Validation**: JSON schema-based configuration validation
- **Dual Editing Modes**: Both form-based and direct JSON editing interfaces
- **Toast Notifications**: Real-time feedback for user actions
- **Responsive Design**: Mobile-friendly interface with DaisyUI components

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.60+
- Tauri CLI

### Installation and Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## 💡 How to Use

### 1. Select Project Directory
1. Launch the app and click the **Browse** button
2. Select the project folder where you want to apply MCP configuration
3. Existing `.mcp.json` files will be automatically loaded

### 2. Configure MCP Servers
1. Click **Add Server** to add a new server configuration
2. Choose between **Form Editor** and **JSON Editor** tabs:
   - **Form Editor**: User-friendly form interface
   - **JSON Editor**: Direct JSON editing for advanced users
3. Enter server information:
   - **Server Name**: Unique identifier for the server
   - **Command**: Execution command (e.g., `npx`, `uvx`)
   - **Arguments**: Command arguments (one per line in form mode)
   - **Environment Variables**: JSON-formatted environment variables

### 3. Validate and Save Configuration
1. Use **Validate Configuration** to check settings validity
2. Click **Save .mcp.json** to create the configuration file
3. When no servers are configured, the button changes to **Clear .mcp.json**

### 4. Manage Server Library
- Added servers are automatically saved to **Saved Servers** list
- Use **Add to Current** button to reuse servers in other projects
- Edit or delete saved servers with dedicated buttons

## 📁 MCP Configuration File Format

Generated `.mcp.json` file example:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🏗️ Technology Stack

- **Frontend**: TypeScript, Vanilla HTML/CSS, DaisyUI v4, Tailwind CSS v3
- **Backend**: Rust, Tauri
- **UI Framework**: DaisyUI with responsive design
- **Notifications**: Custom toast notification system
- **Data Storage**: JSON files (local app data)

## 📂 Project Structure

```
mcp-server-config-app/
├── src/                    # Frontend source
│   ├── main.ts            # Main TypeScript application
│   ├── toast.ts           # Toast notification system
│   └── styles.css         # Tailwind CSS and custom styles
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   ├── lib.rs         # Main Rust logic
│   │   └── main.rs        # Entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── index.html             # Main HTML file
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
└── package.json           # Node.js dependencies
```

## 🎨 User Interface

### Main Screen
- **Project Directory**: Displays currently selected project path
- **MCP Servers**: Current project's server list (editable/removable)
- **Saved Servers**: Saved server library (reusable across projects)
- **Action Buttons**: Configuration validation and save/clear operations

### Server Add/Edit Modal
- **Tabbed Interface**: Switch between Form Editor and JSON Editor
- **Form Editor**: User-friendly input fields with validation
- **JSON Editor**: Direct JSON editing with syntax highlighting and validation
- **Bidirectional Sync**: Automatic synchronization between form and JSON views

### Advanced Features
- **Theme Switching**: Multiple DaisyUI themes (Light, Dark, Cupcake, Emerald)
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Toast Notifications**: Success, error, warning, and info messages
- **Real-time Validation**: Immediate feedback on configuration errors

## 🔧 Development Guide

### Adding Dependencies
```bash
# Frontend dependencies
npm install <package-name>

# Tauri plugins
cargo add <crate-name> --manifest-path src-tauri/Cargo.toml
```

### Build Configuration
- **Development**: `npm run tauri dev`
- **Production Build**: `npm run tauri build`
- **Type Checking**: `npm run build` (TypeScript compilation)

### CI/CD
This project includes GitHub Actions workflow for automated building:
- **Multi-platform builds**: Supports Windows, macOS (Universal), and Linux
- **Automated releases**: Creates draft releases on version tags
- **Code quality checks**: TypeScript compilation and linting

### UI Development
- **Styling**: Use DaisyUI components with Tailwind CSS utilities
- **Responsiveness**: Mobile-first approach with responsive breakpoints
- **Toast System**: Consistent notification patterns across the app

## 📖 References

- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)
- [Claude Code MCP Setup Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Tauri Official Documentation](https://tauri.app/v1/guides/)
- [DaisyUI Component Library](https://daisyui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Bug Reports

Please report bugs or feature requests on [GitHub Issues](https://github.com/your-username/mcp-server-config-app/issues).