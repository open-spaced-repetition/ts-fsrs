# Development Environment Quickstart Guide

This guide will help you quickly set up and start developing ts-fsrs using VS Code Dev Containers.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Visual Studio Code**: [Download VS Code](https://code.visualstudio.com/)
- **Docker Desktop**: [Download Docker](https://www.docker.com/products/docker-desktop)
  - For Windows: Docker Desktop 2.0+ with WSL 2 backend
  - For macOS: Docker Desktop 2.0+
  - For Linux: Docker CE/EE 18.06+
- **VS Code Dev Containers Extension**: Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

## Quick Start

### 1. Open the Project in Dev Container

There are two ways to open the project in a Dev Container:

**Option A: From VS Code**

1. Open VS Code
2. Press `F1` or `Ctrl+Shift+P` (Windows/Linux) / `Cmd+Shift+P` (macOS)
3. Type and select: `Dev Containers: Open Folder in Container...`
4. Select the `ts-fsrs` project folder
5. Wait for the container to build and initialize (this may take several minutes on the first run)

**Option B: From Command Palette**

1. Open the project folder in VS Code
2. A notification will appear: "Folder contains a Dev Container configuration file"
3. Click "Reopen in Container"

### 2. Wait for Setup to Complete

The Dev Container will automatically:

- Build the Docker image based on the official Rust image
- Install Node.js 20 with node-gyp dependencies
- Set up Rust toolchain with WASM support (`wasm32-wasip1-threads` target)
- Install WASI SDK for WebAssembly builds
- Enable and configure pnpm package manager
- Install all Node.js dependencies
- Download test data (`revlog.csv`)
- Configure the bash prompt with git information
- Install recommended VS Code extensions

You can monitor the progress in the VS Code terminal. The setup is complete when you see:

```
✅ Development environment setup complete!
```

### 3. Verify Your Environment

Open a new terminal in VS Code (`Terminal` → `New Terminal`) and verify the installation:

```bash
# Check Node.js and pnpm
node --version    # Should show v20.x.x
pnpm --version    # Should show the configured version

# Check Rust toolchain
rustc --version   # Should show the installed Rust version
cargo --version   # Should show the installed Cargo version

# Check WASM target
rustup target list --installed | grep wasm32-wasip1-threads
```

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Building the Project

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter ts-fsrs build
pnpm --filter @ts-fsrs/binding build
```

### Type Checking

```bash
# Run type check
pnpm typecheck
```

### Code Quality Checks

```bash
# Run all checks (lint, format, type check)
pnpm check

# Auto-fix linting and formatting issues
pnpm check:fix
```

### Working with Rust/WASM

The project includes Rust code that compiles to WebAssembly:

```bash
# Navigate to the Rust package
cd packages/binding

# Build Rust code
cargo build

# Run Rust tests
cargo test

# Build WASM module
cargo build --target wasm32-wasip1-threads
```

## Available VS Code Extensions

The Dev Container automatically installs these extensions:

### TypeScript & JavaScript

- **Biome**: Code formatter and linter
- **Pretty TypeScript Errors**: Better error messages
- **Prettier**: Code formatter

### Rust

- **rust-analyzer**: Rust language support
- **Even Better TOML**: TOML file support
- **CodeLLDB**: Debugger for Rust

### Git & GitHub

- **GitHub Pull Requests**: Manage PRs from VS Code
- **Git History**: View git log and history

### AI Assistants

- **GitHub Copilot**: AI pair programmer
- **ChatGPT**: OpenAI integration
- **Claude Code**: Anthropic Claude integration

### Utilities

- **EditorConfig**: Maintain consistent coding styles
- **Code Spell Checker**: Catch typos

## Project Structure

```
ts-fsrs/
├── packages/
│   ├── ts-fsrs/          # Main TypeScript package
│   ├── binding/          # Rust WASM bindings
│   └── ...
├── .devcontainer/        # Dev Container configuration
│   ├── devcontainer.json # Container configuration
│   ├── Dockerfile        # Container image definition
│   ├── setup.sh          # Initialization script
│   └── csv.sh            # Test data download script
├── pnpm-workspace.yaml   # Monorepo workspace configuration
└── package.json          # Root package configuration
```

## Troubleshooting

### Container Build Fails

If the container fails to build:

1. Ensure Docker Desktop is running
2. Check your internet connection
3. Try rebuilding: `F1` → `Dev Containers: Rebuild Container`

### pnpm Not Found

If `pnpm` command is not found after setup:

```bash
# Reload the shell configuration
source ~/.bashrc

# Verify pnpm is in PATH
echo $PATH | grep pnpm
```

### Slow Network (China Users)

If you're in China and experiencing slow downloads, you can enable proxy settings:

1. Edit `.devcontainer/devcontainer.json`
2. Uncomment the proxy configuration section:

```json
"runArgs": ["--add-host=host.docker.internal:host-gateway"],
"containerEnv": {
  "HTTP_PROXY": "http://host.docker.internal:7890",
  "HTTPS_PROXY": "http://host.docker.internal:7890",
  "NO_PROXY": "localhost,127.0.0.1,::1"
}
```

3. Adjust the port (7890) to match your proxy configuration
4. Rebuild the container

## Additional Resources

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [ts-fsrs Documentation](https://open-spaced-repetition.github.io/ts-fsrs/)
- [FSRS Algorithm Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- [Project README](../README.md)

## Next Steps

Now that your environment is set up, you can:

- Explore the codebase
- Run existing tests to understand the functionality
- Make changes and see them in action
- Create new features or fix bugs
- Submit pull requests to contribute

Happy coding! 🚀
