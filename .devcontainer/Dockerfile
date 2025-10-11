# Use official devcontainers Rust image
FROM mcr.microsoft.com/devcontainers/rust:latest

# Install additional system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    # Build tools
    build-essential \
    pkg-config \
    libssl-dev \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Add wasm32-wasip1-threads target for WASM builds
RUN rustup target add wasm32-wasip1-threads

# Install cargo-binstall for faster installation of Rust tools
RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash

# Install wasi-sdk for WASM builds
RUN WASI_SDK_VERSION=27.0 && \
    WASI_SDK_ARCH=$(uname -m) && \
    if [ "$WASI_SDK_ARCH" = "x86_64" ]; then WASI_SDK_ARCH="x86_64"; \
    elif [ "$WASI_SDK_ARCH" = "aarch64" ]; then WASI_SDK_ARCH="arm64"; \
    else WASI_SDK_ARCH="x86_64"; fi && \
    curl -L "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION%%.*}/wasi-sdk-${WASI_SDK_VERSION}-${WASI_SDK_ARCH}-linux.tar.gz" -o /tmp/wasi-sdk.tar.gz && \
    mkdir -p /home/vscode/.wasi-sdk && \
    tar -xzf /tmp/wasi-sdk.tar.gz -C /tmp && \
    mv /tmp/wasi-sdk-${WASI_SDK_VERSION}-${WASI_SDK_ARCH}-linux/* /home/vscode/.wasi-sdk/ && \
    rm -rf /tmp/wasi-sdk* && \
    chown -R vscode:vscode /home/vscode/.wasi-sdk

# Fix cargo registry permissions for vscode user
RUN chmod -R a+rw /usr/local/cargo/registry || true \
    && chmod -R a+rw /usr/local/cargo/git || true

# Set working directory
WORKDIR /workspace
