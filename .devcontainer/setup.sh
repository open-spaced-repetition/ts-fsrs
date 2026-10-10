#!/bin/bash

set -e

echo "🚀 Setting up ts-fsrs development environment..."

# Keep generated binding artifacts writable on their Docker volume.
sudo chown "$(id -u):$(id -g)" packages/binding/dist

# Fix SSH permissions if .ssh directory exists
if [ -d "/home/vscode/.ssh" ]; then
    echo "🔑 Fixing SSH permissions..."
    chmod 700 /home/vscode/.ssh
    chmod 600 /home/vscode/.ssh/* 2>/dev/null || true
    chmod 644 /home/vscode/.ssh/*.pub 2>/dev/null || true
    echo "✅ SSH permissions fixed"
fi

# Enable corepack and install pnpm (version controlled by package.json)
echo "📦 Enabling corepack and installing pnpm..."
npm install --global corepack@0.36.0 --force
corepack enable
yes | corepack install || corepack install



# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Download revlog.csv if it doesn't exist
.devcontainer/csv.sh

# # Install AI CLI tools globally
# echo "📦 Installing AI CLI tools..."
# pnpm install -g @anthropic-ai/claude-code @openai/codex @google/gemini-cli
# echo "✅ AI CLI tools installed successfully"


# Check Rust toolchain
echo "🦀 Checking Rust toolchain..."
rustc --version
cargo --version

# Check Node.js and pnpm
echo "📦 Checking Node.js and pnpm..."
node --version
pnpm --version

# Configure bash prompt with git info
echo "🎨 Configuring bash prompt..."
cat >> /home/vscode/.bashrc << 'PROMPT_EOF'

# Custom prompt with git repository and branch info
parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
}

parse_git_repo() {
    basename $(git rev-parse --show-toplevel 2>/dev/null || echo "")
}

export PS1='\[\033[01;32m\]\u\[\033[00m\]:\[\033[01;34m\]$(parse_git_repo)\[\033[00m\]\[\033[01;33m\]$(parse_git_branch)\[\033[00m\] \[\033[01;36m\]\w\[\033[00m\]\$ '
PROMPT_EOF
source /home/vscode/.bashrc

echo "✅ Development environment setup complete!"
