#!/bin/bash

set -e

echo "🚀 Setting up ts-fsrs development environment..."

# Enable corepack and install pnpm (version controlled by package.json)
echo "📦 Enabling corepack and installing pnpm..."
corepack enable
yes | corepack install || corepack install



# Set SHELL environment variable for pnpm setup
export SHELL=/bin/bash

# Configure pnpm global bin path
echo "📦 Configuring pnpm global directory..."
pnpm setup
# Set PNPM_HOME and update PATH for current session
export PNPM_HOME="/home/vscode/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Reload shell configuration to ensure persistence
if [ -f /home/vscode/.bashrc ]; then
    source /home/vscode/.bashrc
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Download revlog.csv if it doesn't exist
REVLOG_FILE="packages/binding/__tests__/revlog.csv"
if [ ! -f "$REVLOG_FILE" ]; then
    echo "📥 Downloading revlog.csv for tests..."
    mkdir -p "$(dirname "$REVLOG_FILE")"
    curl -L -o "$REVLOG_FILE" "https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv"
    echo "✅ revlog.csv downloaded successfully"
else
    echo "✅ revlog.csv already exists, skipping download"
fi

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
